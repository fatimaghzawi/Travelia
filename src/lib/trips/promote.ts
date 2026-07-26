import mongoose from "mongoose";
import {
  Booking,
  Checklist,
  Destination,
  Expense,
  Payment,
  Trip,
  TripPackage,
  VisitedPlace,
} from "@/models";
import type { ITrip } from "@/models/trip.model";
import {
  bookingWindow,
  deriveTripStatus,
  startOfDay,
} from "@/lib/trips/status";
import { notifyUser } from "@/lib/notifications/notify";

type LeanBooking = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  destinationId?: mongoose.Types.ObjectId | null;
  activityId?: mongoose.Types.ObjectId | null;
  tripPackageId?: mongoose.Types.ObjectId | null;
  tripId?: mongoose.Types.ObjectId | null;
  travelDate: Date;
  price?: number | null;
  currency?: string;
  status: string;
  paymentStatus: string;
  createdAt?: Date;
};

type Group = {
  key: string;
  bookings: LeanBooking[];
  start: Date;
  end: Date;
  destinationId: mongoose.Types.ObjectId | null;
  title: string;
  coverImage: string | null;
  totalBudget: number;
  estimatedCost: number;
};

function money(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value && typeof value === "object" && "toString" in value) {
    const n = Number(String((value as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dayKey(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function windowsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return (
    startOfDay(aStart).getTime() <= startOfDay(bEnd).getTime() &&
    startOfDay(bStart).getTime() <= startOfDay(aEnd).getTime()
  );
}

async function ensureVisitedPlace(trip: ITrip) {
  if (trip.status !== "completed" || !trip.destinationId) return;

  try {
    await VisitedPlace.findOneAndUpdate(
      {
        userId: trip.userId,
        destinationId: trip.destinationId,
        tripId: trip._id,
      },
      {
        $setOnInsert: {
          userId: trip.userId,
          destinationId: trip.destinationId,
          tripId: trip._id,
          visitDate: trip.endDate,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    console.warn("[trips] ensureVisitedPlace skipped", error);
  }
}

/**
 * Sync Trip.status from dates and create VisitedPlace when completed.
 * Never downgrades a manually completed trip back to ongoing/upcoming.
 */
export async function healTripStatuses(userId: string) {
  const trips = await Trip.find({
    userId,
    status: { $in: ["planning", "upcoming", "ongoing", "completed"] },
  });

  for (const trip of trips) {
    if (trip.status === "cancelled") continue;

    // Traveler-marked completed stays completed even if endDate is still ahead
    if (trip.status === "completed") {
      await ensureVisitedPlace(trip);
      continue;
    }

    const next = deriveTripStatus(trip.startDate, trip.endDate);
    if (trip.status !== next) {
      trip.status = next;
      await trip.save();
      if (next === "completed") {
        await ensureVisitedPlace(trip);
        await notifyUser({
          userId: trip.userId,
          title: "Trip completed",
          message: `"${trip.title}" has ended. Capture memories in your travel journal or leave a review.`,
          type: "trip",
          link: `/dashboard/trips/${String(trip._id)}`,
          relatedId: trip._id,
          emailSubject: `Trip completed · ${trip.title}`,
          ctaLabel: "Open trip",
        }).catch(() => undefined);
      }
    }
    if (next === "completed") {
      await ensureVisitedPlace(trip);
    }
  }
}

/** Mark a trip completed (manual) and record visited place when possible. */
export async function markTripCompleted(trip: ITrip) {
  trip.status = "completed";
  // Align end date so date-based derivation also stays completed
  const today = startOfDay();
  if (startOfDay(trip.endDate).getTime() > today.getTime()) {
    trip.endDate = today;
  }
  await trip.save();
  await ensureVisitedPlace(trip);

  await notifyUser({
    userId: trip.userId,
    title: "Trip completed",
    message: `"${trip.title}" is marked complete. Add journal memories or leave a review when you’re ready.`,
    type: "trip",
    link: `/dashboard/trips/${String(trip._id)}`,
    relatedId: trip._id,
    emailSubject: `Trip completed · ${trip.title}`,
    ctaLabel: "Open trip",
  }).catch(() => undefined);

  return trip;
}

/**
 * Merge duplicate My Trips cards for the same destination/journey.
 * Keeps the earliest trip, moves bookings/expenses/checklists onto it.
 */
export async function mergeDuplicateDestinationTrips(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const trips = await Trip.find({
    userId: uid,
    status: { $nin: ["cancelled"] },
    destinationId: { $ne: null },
  }).sort({ startDate: 1, createdAt: 1 });

  const byDest = new Map<string, typeof trips>();
  for (const trip of trips) {
    const dest = trip.destinationId ? String(trip.destinationId) : "";
    if (!dest) continue;
    const list = byDest.get(dest) ?? [];
    list.push(trip);
    byDest.set(dest, list);
  }

  for (const list of byDest.values()) {
    if (list.length < 2) continue;

    const survivors: typeof trips = [];

    for (const trip of list) {
      const match = survivors.find((s) =>
        windowsOverlap(s.startDate, s.endDate, trip.startDate, trip.endDate)
      );

      if (!match) {
        survivors.push(trip);
        continue;
      }

      // Merge trip → match
      if (trip.startDate.getTime() < match.startDate.getTime()) {
        match.startDate = trip.startDate;
      }
      if (trip.endDate.getTime() > match.endDate.getTime()) {
        match.endDate = trip.endDate;
      }
      match.estimatedCost =
        money(match.estimatedCost) + money(trip.estimatedCost);
      // Keep traveler-set ceiling; never auto-raise from estimated booking cost
      match.totalBudget = Math.max(
        money(match.totalBudget),
        money(trip.totalBudget)
      );
      if (!match.coverImage && trip.coverImage) {
        match.coverImage = trip.coverImage;
      }
      match.status =
        match.status === "completed" || trip.status === "completed"
          ? "completed"
          : deriveTripStatus(match.startDate, match.endDate);
      await match.save();

      await Booking.updateMany(
        { tripId: trip._id, userId: uid },
        { $set: { tripId: match._id } }
      );
      await Expense.updateMany(
        { tripId: trip._id, userId: uid },
        { $set: { tripId: match._id } }
      );
      await Checklist.updateMany(
        { tripId: trip._id, userId: uid },
        { $set: { tripId: match._id } }
      );

      trip.status = "cancelled";
      await trip.save();
    }
  }
}

function addToGroup(
  groups: Map<string, Group>,
  key: string,
  booking: LeanBooking,
  meta: {
    start: Date;
    end: Date;
    destinationId: mongoose.Types.ObjectId | null;
    title: string;
    coverImage: string | null;
    price: number;
    budgetFallback: number;
  }
) {
  const existing = groups.get(key);
  if (existing) {
    existing.bookings.push(booking);
    existing.estimatedCost += meta.price;
    if (meta.end.getTime() > existing.end.getTime()) existing.end = meta.end;
    if (meta.start.getTime() < existing.start.getTime()) {
      existing.start = meta.start;
    }
    return;
  }

  groups.set(key, {
    key,
    bookings: [booking],
    start: meta.start,
    end: meta.end,
    destinationId: meta.destinationId,
    title: meta.title,
    coverImage: meta.coverImage,
    totalBudget: 0,
    estimatedCost: meta.price,
  });
}

function findOpenGroup(
  groups: Map<string, Group>,
  destId: string | null,
  start: Date,
  end: Date
) {
  if (!destId) return null;
  for (const group of groups.values()) {
    if (!group.destinationId || String(group.destinationId) !== destId) {
      continue;
    }
    if (windowsOverlap(group.start, group.end, start, end)) return group;
    if (dayKey(group.start) === dayKey(start)) return group;
  }
  return null;
}

/**
 * Promote paid bookings whose travel window has started into Trip records.
 * One destination journey (package + activities) → one My Trips card.
 */
export async function promoteBookingsToTrips(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const today = startOfDay();

  await mergeDuplicateDestinationTrips(userId);

  const bookings = (await Booking.find({
    userId: uid,
    tripId: null,
    status: { $in: ["confirmed", "completed"] },
    paymentStatus: "paid",
  }).lean()) as unknown as LeanBooking[];

  if (bookings.length === 0) {
    await healTripStatuses(userId);
    return;
  }

  const packageIds = [
    ...new Set(
      bookings
        .map((b) => b.tripPackageId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];
  const packages = packageIds.length
    ? await TripPackage.find({ _id: { $in: packageIds } })
        .select("title departureDate returnDate price destinationId")
        .lean()
    : [];
  const packageById = new Map(packages.map((p) => [String(p._id), p]));

  const destinationIds = [
    ...new Set(
      bookings
        .map((b) => b.destinationId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];
  const destinations = destinationIds.length
    ? await Destination.find({ _id: { $in: destinationIds } })
        .select("title city country thumbnail estimatedBudget")
        .lean()
    : [];
  const destinationById = new Map(
    destinations.map((d) => [String(d._id), d])
  );

  const bookingById = new Map(bookings.map((b) => [String(b._id), b]));
  const claimed = new Set<string>();
  const groups = new Map<string, Group>();

  function bookingMeta(booking: LeanBooking) {
    const pkg = booking.tripPackageId
      ? packageById.get(String(booking.tripPackageId))
      : null;
    const { start, end } = bookingWindow({
      travelDate: booking.travelDate,
      departureDate: pkg?.departureDate ?? null,
      returnDate: pkg?.returnDate ?? null,
    });
    const destId = booking.destinationId
      ? String(booking.destinationId)
      : pkg?.destinationId
        ? String(pkg.destinationId)
        : null;
    const destination = destId ? destinationById.get(destId) : null;
    const price = money(booking.price) || money(pkg?.price);
    return {
      start,
      end,
      destId,
      destination,
      pkg,
      price,
      title:
        (pkg?.title || destination?.title || "My trip").trim().slice(0, 100) ||
        "My trip",
      coverImage: destination?.thumbnail ?? null,
      budgetFallback: money(destination?.estimatedBudget) || price || 0,
    };
  }

  // 1) Prefer one trip per completed payment (journey checkout)
  const payments = await Payment.find({
    userId: uid,
    status: "completed",
  })
    .sort("-createdAt")
    .lean();

  for (const payment of payments) {
    const ids = [
      ...new Set(
        [
          ...(payment.bookingIds?.length ? payment.bookingIds : []),
          payment.bookingId,
        ]
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const members = ids
      .map((id) => bookingById.get(id))
      .filter((b): b is LeanBooking => Boolean(b) && !claimed.has(String(b!._id)));

    if (members.length === 0) continue;

    const metas = members.map(bookingMeta);
    // Promote only once travel has started for at least one line
    if (metas.every((m) => today.getTime() < m.start.getTime())) continue;

    let start = metas[0]!.start;
    let end = metas[0]!.end;
    let estimatedCost = 0;
    let destinationId: mongoose.Types.ObjectId | null = null;
    let title = "My trip";
    let coverImage: string | null = null;
    let budgetFallback = 0;

    for (let i = 0; i < members.length; i++) {
      const meta = metas[i]!;
      estimatedCost += meta.price;
      if (meta.start.getTime() < start.getTime()) start = meta.start;
      if (meta.end.getTime() > end.getTime()) end = meta.end;
      if (meta.destId) {
        destinationId = new mongoose.Types.ObjectId(meta.destId);
      }
      if (meta.pkg?.title) title = meta.title;
      else if (title === "My trip") title = meta.title;
      if (!coverImage) coverImage = meta.coverImage;
      budgetFallback = Math.max(budgetFallback, meta.budgetFallback);
    }

    const key = `pay:${String(payment._id)}`;
    groups.set(key, {
      key,
      bookings: members,
      start,
      end,
      destinationId,
      title,
      coverImage,
      totalBudget: 0,
      estimatedCost,
    });
    for (const m of members) claimed.add(String(m._id));
  }

  // 2) Remaining bookings: one card per destination journey window
  //    Package bookings first so activities can attach to them.
  const remaining = bookings.filter((b) => !claimed.has(String(b._id)));
  const ordered = [
    ...remaining.filter((b) => b.tripPackageId),
    ...remaining.filter((b) => !b.tripPackageId),
  ];

  for (const booking of ordered) {
    const meta = bookingMeta(booking);
    if (today.getTime() < meta.start.getTime()) continue;

    const existing = findOpenGroup(
      groups,
      meta.destId,
      meta.start,
      meta.end
    );
    const key =
      existing?.key ||
      (meta.destId
        ? `dest:${meta.destId}:${dayKey(meta.start)}`
        : `booking:${booking._id}`);

    addToGroup(groups, key, booking, {
      start: meta.start,
      end: meta.end,
      destinationId: meta.destId
        ? new mongoose.Types.ObjectId(meta.destId)
        : null,
      title: meta.title,
      coverImage: meta.coverImage,
      price: meta.price,
      budgetFallback: meta.budgetFallback,
    });
    claimed.add(String(booking._id));
  }

  for (const group of groups.values()) {
    try {
      const bookingIds = group.bookings.map((b) => b._id);

      const stillOpen = await Booking.find({
        _id: { $in: bookingIds },
        userId: uid,
        tripId: null,
        paymentStatus: "paid",
        status: { $in: ["confirmed", "completed"] },
      }).select("_id");

      if (stillOpen.length === 0) continue;

      const openIds = stillOpen.map((b) => b._id);
      const status = deriveTripStatus(group.start, group.end, today);
      const title =
        group.title.length >= 3 ? group.title.slice(0, 100) : "My trip";

      // Prefer attaching to an existing destination trip with overlapping dates
      let trip: ITrip | null = null;
      let createdNew = false;
      if (group.destinationId) {
        trip = await Trip.findOne({
          userId: uid,
          destinationId: group.destinationId,
          status: { $nin: ["cancelled"] },
          startDate: { $lte: group.end },
          endDate: { $gte: group.start },
        }).sort({ startDate: 1 });
      }

      if (trip) {
        if (group.start.getTime() < trip.startDate.getTime()) {
          trip.startDate = group.start;
        }
        if (group.end.getTime() > trip.endDate.getTime()) {
          trip.endDate = group.end;
        }
        trip.estimatedCost =
          money(trip.estimatedCost) + money(group.estimatedCost);
        // Do not overwrite a traveler-set budget with booking totals
        trip.totalBudget = money(trip.totalBudget);
        if (!trip.coverImage && group.coverImage) {
          trip.coverImage = group.coverImage;
        }
        // Never reopen a completed trip when attaching more bookings
        if (trip.status !== "completed") {
          trip.status = deriveTripStatus(trip.startDate, trip.endDate, today);
        }
        await trip.save();
      } else {
        trip = await Trip.create({
          userId: uid,
          destinationId: group.destinationId,
          title,
          description: null,
          coverImage: group.coverImage || null,
          startDate: group.start,
          endDate: group.end,
          status,
          totalBudget: 0,
          estimatedCost: group.estimatedCost,
          days: [],
        });
        createdNew = true;
      }

      await Booking.updateMany(
        { _id: { $in: openIds }, tripId: null },
        { $set: { tripId: trip._id } }
      );

      if (createdNew) {
        await notifyUser({
          userId: uid,
          title: "Trip ready in My Trips",
          message: `"${title}" is on your atlas — open it to plan checklists, budget, and journal notes.`,
          type: "trip",
          link: `/dashboard/trips/${String(trip._id)}`,
          relatedId: trip._id,
          emailSubject: `Your trip is ready · ${title}`,
          ctaLabel: "Open trip",
        }).catch(() => undefined);
      }

      if (trip.status === "completed") {
        await ensureVisitedPlace(trip);
      }
    } catch (error) {
      console.error("[trips] promote group failed", group.key, error);
    }
  }

  await mergeDuplicateDestinationTrips(userId);
  await healTripStatuses(userId);
}

/** Per-process throttle so dashboard/trips/bookings don't re-sync on every GET. */
const SYNC_TTL_MS = 60_000;
const lastSyncAt = new Map<string, number>();

/**
 * Run promotion + status heal for a traveler.
 * Throttled per user (60s) — force=true bypasses for payment/webhook paths.
 */
export async function syncTravelerTrips(
  userId: string,
  options?: { force?: boolean }
) {
  const now = Date.now();
  const previous = lastSyncAt.get(userId) ?? 0;
  if (!options?.force && now - previous < SYNC_TTL_MS) {
    return;
  }
  lastSyncAt.set(userId, now);

  // Cap map size in long-lived Node processes
  if (lastSyncAt.size > 5_000) {
    const cutoff = now - SYNC_TTL_MS * 2;
    for (const [id, ts] of lastSyncAt) {
      if (ts < cutoff) lastSyncAt.delete(id);
    }
  }

  const { connectDB } = await import("@/lib/db/mongoose");
  await connectDB();
  await promoteBookingsToTrips(userId);
}
