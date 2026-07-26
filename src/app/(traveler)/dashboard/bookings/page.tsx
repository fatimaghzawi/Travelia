import type { Metadata } from "next";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Booking, Payment } from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";
import {
  BookingsPageUi,
  type BookingLineItem,
  type BookingReservation,
} from "@/components/traveler/BookingsPageUi";

export const metadata: Metadata = {
  title: "My bookings · Travelia",
  description: "Your confirmed Travelia reservations.",
};

type PopulatedDestination = {
  _id: unknown;
  title?: string;
  city?: string;
  country?: string;
  slug?: string;
  thumbnail?: string;
} | null;

type PopulatedActivity = {
  _id: unknown;
  title?: string;
  duration?: number;
  price?: number;
} | null;

type PopulatedPackage = {
  _id: unknown;
  title?: string | null;
  departureDate?: Date | string;
  returnDate?: Date | string;
  guideIncluded?: boolean;
  price?: number;
} | null;

type BookingLean = {
  _id: unknown;
  status: string;
  paymentStatus: string;
  price?: number | null;
  currency?: string;
  travelDate: Date | string;
  notes?: string | null;
  createdAt?: Date | string;
  destinationId?: PopulatedDestination | unknown;
  activityId?: PopulatedActivity | unknown;
  tripPackageId?: PopulatedPackage | unknown;
};

function asDest(value: unknown): PopulatedDestination {
  if (!value || typeof value !== "object" || !("_id" in value)) return null;
  return value as PopulatedDestination;
}

function asActivity(value: unknown): PopulatedActivity {
  if (!value || typeof value !== "object" || !("_id" in value)) return null;
  return value as PopulatedActivity;
}

function asPackage(value: unknown): PopulatedPackage {
  if (!value || typeof value !== "object" || !("_id" in value)) return null;
  return value as PopulatedPackage;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(value: Date | string | undefined | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function money(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  // Decimal128 / BSON-like
  if (value && typeof value === "object" && "toString" in value) {
    const n = Number(String((value as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function tripStart(booking: BookingLean) {
  const pkg = asPackage(booking.tripPackageId);
  if (pkg?.departureDate) {
    const start = new Date(pkg.departureDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const travel = new Date(booking.travelDate);
  travel.setHours(0, 0, 0, 0);
  return travel;
}

function tripEnd(booking: BookingLean) {
  const pkg = asPackage(booking.tripPackageId);
  if (pkg?.returnDate) {
    const end = new Date(pkg.returnDate);
    end.setHours(0, 0, 0, 0);
    return end;
  }
  return tripStart(booking);
}

function bookingPhase(booking: BookingLean): "upcoming" | "active" | "past" {
  const today = startOfToday().getTime();
  const start = tripStart(booking).getTime();
  const end = tripEnd(booking).getTime();
  if (today > end) return "past";
  if (today >= start) return "active";
  return "upcoming";
}

function resolvePrice(booking: BookingLean): number {
  const stored = money(booking.price);
  if (stored > 0) return stored;

  const pkg = asPackage(booking.tripPackageId);
  const pkgPrice = money(pkg?.price);
  if (pkgPrice > 0) return pkgPrice;

  const activity = asActivity(booking.activityId);
  const actPrice = money(activity?.price);
  if (actPrice > 0) return actPrice;

  return stored;
}

function confirmationCode(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
}

function destinationKey(booking: BookingLean) {
  const dest = asDest(booking.destinationId);
  if (dest?._id) return String(dest._id);
  if (booking.destinationId) return String(booking.destinationId);
  return "unknown";
}

function createdBucket(booking: BookingLean) {
  const createdMs = booking.createdAt
    ? new Date(booking.createdAt).getTime()
    : 0;
  return Number.isFinite(createdMs)
    ? Math.floor(createdMs / (2 * 60 * 1000))
    : 0;
}

/** Pull in package/activity siblings from the same journey checkout. */
function expandJourneySiblings(
  seed: BookingLean[],
  all: BookingLean[],
  alreadyGrouped: Set<string>
) {
  const byId = new Map(seed.map((b) => [String(b._id), b]));

  // Match by destination + create window only. Travel dates can differ for
  // older journeys (activities used to store "today" while the trip used
  // departure), so requiring the same travel day dropped activities.
  const windows = seed.map((member) => ({
    dest: destinationKey(member),
    createdMs: member.createdAt
      ? new Date(member.createdAt).getTime()
      : 0,
  }));

  for (const candidate of all) {
    const id = String(candidate._id);
    if (byId.has(id) || alreadyGrouped.has(id)) continue;
    const dest = destinationKey(candidate);
    const createdMs = candidate.createdAt
      ? new Date(candidate.createdAt).getTime()
      : 0;

    const sameJourney = windows.some((window) => {
      if (window.dest !== dest) return false;
      if (!Number.isFinite(window.createdMs) || !Number.isFinite(createdMs)) {
        return false;
      }
      return Math.abs(createdMs - window.createdMs) <= 5 * 60 * 1000;
    });
    if (!sameJourney) continue;
    byId.set(id, candidate);
  }

  return [...byId.values()].sort((a, b) => {
    const aTrip = asPackage(a.tripPackageId) ? 0 : 1;
    const bTrip = asPackage(b.tripPackageId) ? 0 : 1;
    if (aTrip !== bTrip) return aTrip - bTrip;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

function formatRange(start?: Date | string | null, end?: Date | string | null) {
  if (!start || !end) return null;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

function mapLine(booking: BookingLean): BookingLineItem {
  const destination = asDest(booking.destinationId);
  const activity = asActivity(booking.activityId);
  const tripPackage = asPackage(booking.tripPackageId);
  const phase = bookingPhase(booking);
  const price = resolvePrice(booking);

  let title = "Reservation";
  let subtitle: string | null = null;
  let kind: "trip" | "experience" = "experience";

  if (tripPackage) {
    kind = "trip";
    title = tripPackage.title || destination?.title || "Trip package";
    subtitle = formatRange(tripPackage.departureDate, tripPackage.returnDate);
  } else if (activity) {
    kind = "experience";
    title = activity.title || "Experience";
    const bits = [
      destination?.title,
      typeof activity.duration === "number" ? `${activity.duration} min` : null,
    ].filter(Boolean);
    subtitle = bits.length ? bits.join(" · ") : null;
  } else if (destination) {
    title = destination.title || "Destination";
  }

  const status =
    booking.status === "cancelled"
      ? "cancelled"
      : booking.status === "completed" || phase === "past"
        ? "completed"
        : phase === "active"
          ? "ongoing"
          : String(booking.status);

  return {
    id: String(booking._id),
    title,
    subtitle,
    kind,
    price,
    currency: String(booking.currency || "USD").toUpperCase(),
    travelDate: toIso(booking.travelDate) ?? new Date().toISOString(),
    departureDate: toIso(tripPackage?.departureDate ?? null),
    returnDate: toIso(tripPackage?.returnDate ?? null),
    status,
    // Cancel paid confirmed trips, or release unpaid holds before travel
    canCancel:
      phase === "upcoming" &&
      ((booking.status === "confirmed" && booking.paymentStatus === "paid") ||
        (booking.status === "pending" &&
          ["pending", "failed"].includes(booking.paymentStatus))),
    guideIncluded: Boolean(tripPackage?.guideIncluded),
  };
}

function buildReservation(
  key: string,
  bookings: BookingLean[],
  _paymentAmount?: number | null,
  paymentCurrency?: string | null,
  paidAt?: string | null
): BookingReservation | null {
  const active = bookings.filter((b) => b.status !== "cancelled");
  if (active.length === 0) return null;

  const phases = active.map(bookingPhase);

  // Destination package started/finished → lock cancel on package AND activities
  const packagePhases = active
    .filter((b) => asPackage(b.tripPackageId))
    .map((b) => bookingPhase(b));
  const packageLocked = packagePhases.some(
    (phase) => phase === "active" || phase === "past"
  );

  let lifecycle: "upcoming" | "active" | "past" = phases.some(
    (p) => p === "active"
  )
    ? "active"
    : phases.every((p) => p === "past")
      ? "past"
      : "upcoming";

  // Prefer package window so activities don't keep the card as "upcoming"
  if (packageLocked) {
    lifecycle = packagePhases.some((p) => p === "active")
      ? "active"
      : "past";
  }

  const journeyLocked = lifecycle === "active" || lifecycle === "past";

  const lines = active.map((booking) => {
    const line = mapLine(booking);
    return {
      ...line,
      canCancel: journeyLocked ? false : line.canCancel,
    };
  });

  // Always total remaining (non-cancelled) lines — not the original checkout sum
  const amount = lines.reduce((sum, line) => sum + line.price, 0);

  const destination = asDest(active[0]?.destinationId);
  const allDone = lines.every(
    (l) => l.status === "completed" || l.status === "cancelled"
  );

  return {
    id: key,
    confirmationCode: confirmationCode(key),
    amount,
    currency: String(paymentCurrency || active[0]?.currency || "USD").toUpperCase(),
    paidAt: paidAt ?? toIso(active[0]?.createdAt ?? null),
    status:
      allDone || lifecycle === "past"
        ? "completed"
        : lifecycle === "active"
          ? "ongoing"
          : "confirmed",
    canCancelAny: lines.some((l) => l.canCancel),
    lifecycle,
    destination: destination
      ? {
          id: String(destination._id),
          title: destination.title ?? "Destination",
          city: destination.city ?? null,
          country: destination.country ?? null,
          slug: destination.slug ?? null,
          thumbnail: destination.thumbnail ?? null,
        }
      : null,
    lines,
  };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/bookings");
  }

  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const pageParam = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const qParam = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const page = Math.max(1, Number(pageParam || "1") || 1);
  const pageSize = 6;
  const query = (qParam || "").trim().toLowerCase();

  await connectDB();
  try {
    await syncTravelerTrips(session.user.id);
  } catch (error) {
    console.error("[bookings] syncTravelerTrips failed", error);
  }
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const payments = await Payment.find({
    userId,
    status: { $in: ["completed", "processing"] },
  })
    .sort("-createdAt")
    .lean();

  const paymentLinkedIds = [
    ...new Set(
      payments.flatMap((payment) =>
        [
          ...(payment.bookingIds?.length ? payment.bookingIds : []),
          payment.bookingId,
        ]
          .filter(Boolean)
          .map((id) => String(id))
      )
    ),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  // Heal once: completed Stripe payments → linked bookings paid+confirmed
  const completedLinkedIds = [
    ...new Set(
      payments
        .filter((p) => p.status === "completed")
        .flatMap((payment) =>
          [
            ...(payment.bookingIds?.length ? payment.bookingIds : []),
            payment.bookingId,
          ]
            .filter(Boolean)
            .map((id) => String(id))
        )
    ),
  ]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (completedLinkedIds.length > 0) {
    await Booking.updateMany(
      {
        _id: { $in: completedLinkedIds },
        userId,
        status: { $in: ["pending", "confirmed"] },
        paymentStatus: { $ne: "paid" },
      },
      {
        $set: {
          paymentStatus: "paid",
          status: "confirmed",
        },
      }
    );
  }

  // Include payment-linked rows even if still pending so journey activities
  // are not dropped from the destination ticket.
  const bookings = (await Booking.find({
    userId,
    status: { $ne: "cancelled" },
    $or: [
      { paymentStatus: "paid" },
      { status: { $in: ["confirmed", "completed"] } },
      ...(paymentLinkedIds.length
        ? [{ _id: { $in: paymentLinkedIds } }]
        : []),
    ],
  })
    .populate("destinationId", "title slug city country thumbnail")
    .populate("activityId", "title price duration")
    .populate(
      "tripPackageId",
      "title departureDate returnDate price guideIncluded"
    )
    .sort("-createdAt")
    .lean()) as unknown as BookingLean[];

  const bookingById = new Map(bookings.map((b) => [String(b._id), b]));

  const groupedIds = new Set<string>();
  const reservations: BookingReservation[] = [];

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

    const seed = ids
      .map((id) => bookingById.get(id))
      .filter(Boolean) as BookingLean[];

    // Still show payment group if bookings exist; skip empty
    if (seed.length === 0) continue;

    // Fetch same-destination siblings created in the same checkout window so
    // every journey activity appears on the destination ticket.
    const destIds = [
      ...new Set(
        seed
          .map((b) => destinationKey(b))
          .filter(
            (id) => id !== "unknown" && mongoose.Types.ObjectId.isValid(id)
          )
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const createdTimes = seed
      .map((b) => (b.createdAt ? new Date(b.createdAt).getTime() : NaN))
      .filter((t) => Number.isFinite(t));
    const minCreated = Math.min(...createdTimes);
    const maxCreated = Math.max(...createdTimes);

    if (destIds.length > 0 && Number.isFinite(minCreated)) {
      const siblings = (await Booking.find({
        userId,
        destinationId: { $in: destIds },
        status: { $ne: "cancelled" },
        createdAt: {
          $gte: new Date(minCreated - 5 * 60 * 1000),
          $lte: new Date(maxCreated + 5 * 60 * 1000),
        },
      })
        .populate("destinationId", "title slug city country thumbnail")
        .populate("activityId", "title price duration")
        .populate(
          "tripPackageId",
          "title departureDate returnDate price guideIncluded"
        )
        .lean()) as unknown as BookingLean[];

      for (const sibling of siblings) {
        const sid = String(sibling._id);
        if (bookingById.has(sid)) continue;
        bookingById.set(sid, sibling);
        bookings.push(sibling);
      }
    }

    const group = expandJourneySiblings(seed, bookings, groupedIds);

    const isCompleted = payment.status === "completed";
    const isOpenCheckout =
      payment.status === "processing" || payment.status === "pending";
    // Show paid journeys and unpaid holds waiting for checkout
    if (
      !isCompleted &&
      !isOpenCheckout &&
      !group.some((b) => b.paymentStatus === "paid")
    ) {
      continue;
    }

    // Heal incomplete journey payments: mark every sibling paid and store ids
    if (isCompleted) {
      const groupIds = group
        .map((b) => b._id)
        .filter((id): id is NonNullable<typeof id> => Boolean(id))
        .map((id) =>
          id instanceof mongoose.Types.ObjectId
            ? id
            : new mongoose.Types.ObjectId(String(id))
        );
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { bookingIds: groupIds } }
      );
      await Booking.updateMany(
        {
          _id: { $in: groupIds },
          userId,
          status: { $in: ["pending", "confirmed"] },
        },
        {
          $set: {
            paymentStatus: "paid",
            status: "confirmed",
          },
        }
      );
      for (const booking of group) {
        booking.paymentStatus = "paid";
        if (booking.status === "pending") booking.status = "confirmed";
      }
    }

    for (const booking of group) groupedIds.add(String(booking._id));

    const reservation = buildReservation(
      String(payment._id),
      group,
      money(payment.amount),
      payment.currency,
      toIso(payment.paidAt ?? payment.createdAt ?? null)
    );
    if (reservation) reservations.push(reservation);
  }

  // Orphan bookings (no payment link) — group journey items that share the
  // same destination and were created together.
  const orphans = bookings.filter((booking) => {
    const id = String(booking._id);
    if (groupedIds.has(id)) return false;
    // Keep pending unpaid holds visible so travelers can pay or cancel
    return true;
  });

  const orphanGroups = new Map<string, BookingLean[]>();
  for (const booking of orphans) {
    const key = `${destinationKey(booking)}|${createdBucket(booking)}`;
    const list = orphanGroups.get(key) ?? [];
    list.push(booking);
    orphanGroups.set(key, list);
  }

  for (const [key, group] of orphanGroups) {
    const sorted = expandJourneySiblings(group, group, new Set());
    for (const booking of sorted) groupedIds.add(String(booking._id));
    const amount = sorted.reduce((sum, b) => sum + resolvePrice(b), 0);
    const reservation = buildReservation(
      sorted.length === 1 ? String(sorted[0]!._id) : `journey:${key}`,
      sorted,
      amount,
      sorted[0]?.currency,
      toIso(sorted[0]?.createdAt ?? null)
    );
    if (reservation) reservations.push(reservation);
  }

  const allUpcoming = reservations.filter((r) => r.lifecycle === "upcoming");
  // Keep started + finished bookings as history (Past tab)
  const allPast = reservations.filter(
    (r) => r.lifecycle === "past" || r.lifecycle === "active"
  );

  function matchesFilters(r: BookingReservation) {
    if (!query) return true;
    const haystack = [
      r.confirmationCode,
      r.destination?.title,
      r.destination?.city,
      r.destination?.country,
      ...r.lines.map((l) => l.title),
      ...r.lines.map((l) => l.subtitle),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  const filteredUpcoming = allUpcoming.filter(matchesFilters);
  const filteredPast = allPast.filter(matchesFilters);

  const tab: "upcoming" | "past" =
    tabParam === "past"
      ? "past"
      : tabParam === "upcoming"
        ? "upcoming"
        : filteredUpcoming.length > 0
          ? "upcoming"
          : "past";

  const source = tab === "upcoming" ? filteredUpcoming : filteredPast;
  const total = source.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = source.slice(start, start + pageSize);

  return (
    <BookingsPageUi
      upcoming={tab === "upcoming" ? pageItems : []}
      past={tab === "past" ? pageItems : []}
      upcomingTotal={filteredUpcoming.length}
      pastTotal={filteredPast.length}
      tab={tab}
      initialQuery={qParam?.trim() || ""}
      meta={{
        total,
        page: safePage,
        limit: pageSize,
        totalPages,
      }}
    />
  );
}
