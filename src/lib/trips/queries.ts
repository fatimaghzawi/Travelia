import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Booking, Checklist, Expense, Trip } from "@/models";
import { markTripCompleted, syncTravelerTrips } from "@/lib/trips/promote";
import {
  emptyJournal,
  ensureItineraryDays,
  serializeItineraryDay,
} from "@/lib/trips/itinerary";
import {
  ensureTripDaysPersisted,
  loadTripDaysRaw,
  saveTripDaysRaw,
} from "@/lib/trips/journal-persist";
import {
  buildJournalDaysForTrip,
  serializeStoredJournal,
  upsertTripJournalEntry,
} from "@/lib/trips/trip-journal-store";
import { dayKey } from "@/lib/trips/itinerary";
import type {
  ItineraryUpdateInput,
  UpdateTripInput,
} from "@/validators/trip.validator";

export type PageParams = { page: number; limit: number };

export type TripListFilter = {
  status?:
    | "planning"
    | "upcoming"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "active";
};

/** Traveler's My Trips list with per-trip spend/remaining budget. */
export async function listMyTrips(
  userId: string,
  filter: TripListFilter & PageParams
) {
  await syncTravelerTrips(userId);
  await connectDB();

  const uid = new mongoose.Types.ObjectId(userId);
  const query: Record<string, unknown> = { userId: uid };
  if (filter.status === "active") {
    query.status = { $in: ["ongoing", "upcoming"] };
  } else if (filter.status) {
    query.status = filter.status;
  } else {
    query.status = { $ne: "cancelled" };
  }

  const [items, total] = await Promise.all([
    Trip.find(query)
      .populate("destinationId", "title slug city country thumbnail")
      .sort({ status: 1, startDate: -1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .lean(),
    Trip.countDocuments(query),
  ]);

  const tripIds = items.map((t) => t._id);
  const expenseSums = tripIds.length
    ? await Expense.aggregate<{ _id: unknown; total: number }>([
        { $match: { tripId: { $in: tripIds }, userId: uid } },
        { $group: { _id: "$tripId", total: { $sum: "$amount" } } },
      ])
    : [];
  const spentByTrip = new Map(
    expenseSums.map((row) => [String(row._id), Number(row.total) || 0])
  );

  const data = items.map((trip) => {
    const spent = spentByTrip.get(String(trip._id)) ?? 0;
    return {
      ...trip,
      spent,
      remaining: Math.max(0, (trip.totalBudget ?? 0) - spent),
    };
  });

  return { items: data, total };
}

/** Full trip detail — checklists, expenses, bookings, and spend summary. */
export async function getTripDetail(userId: string, tripId: string) {
  await syncTravelerTrips(userId);
  await connectDB();

  const uid = new mongoose.Types.ObjectId(userId);
  const trip = await Trip.findOne({ _id: tripId, userId: uid })
    .populate("destinationId", "title slug city country thumbnail estimatedBudget")
    .lean();
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");

  const [checklists, expenses, bookings] = await Promise.all([
    Checklist.find({ tripId, userId: uid }).sort("createdAt").lean(),
    Expense.find({ tripId, userId: uid }).sort("-date").lean(),
    Booking.find({ tripId, userId: uid })
      .populate("activityId", "title price duration")
      .populate("tripPackageId", "title departureDate returnDate price")
      .lean(),
  ]);

  const spent = expenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );

  return {
    ...trip,
    checklists,
    expenses,
    bookings,
    spent,
    remaining: Math.max(0, (trip.totalBudget ?? 0) - spent),
  };
}

/** Traveler edit — title/description/budget/cover, or mark-completed transition. */
export async function updateTripAsTraveler(
  userId: string,
  tripId: string,
  input: UpdateTripInput
) {
  await connectDB();

  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");
  if (trip.status === "cancelled") {
    throw new AppError("Cancelled trips cannot be edited", 400, "CANCELLED");
  }

  if (input.title !== undefined) trip.title = input.title;
  if (input.description !== undefined) trip.description = input.description;
  if (input.totalBudget !== undefined) trip.totalBudget = input.totalBudget;
  if (input.coverImage !== undefined) trip.coverImage = input.coverImage;

  if (input.status === "completed" && trip.status !== "completed") {
    await markTripCompleted(trip);
  } else if (input.status && input.status !== trip.status) {
    throw new AppError(
      "Only marking a trip as completed is supported",
      400,
      "INVALID_STATUS"
    );
  } else {
    await trip.save();
  }

  return trip;
}

/** Fetch a traveler's trip scoped to itinerary/journal fields, throws if missing. */
async function findOwnedTrip(
  userId: string,
  tripId: string,
  select: string
) {
  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, userId }).select(select);
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");
  return trip;
}

/** Itinerary days for a trip, scaffolded to the full date range. */
export async function getItinerary(userId: string, tripId: string) {
  const trip = await findOwnedTrip(userId, tripId, "_id startDate endDate");

  const days = await ensureTripDaysPersisted(
    trip._id,
    trip.startDate,
    trip.endDate
  );

  return {
    tripId: String(trip._id),
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: days.map((day, index) => serializeItineraryDay(day, index)),
  };
}

function mapDaysFromInput(days: ItineraryUpdateInput["days"]) {
  return days.map((day) => ({
    ...(day.id && mongoose.Types.ObjectId.isValid(day.id)
      ? { _id: new mongoose.Types.ObjectId(day.id) }
      : {}),
    date: new Date(day.date),
    notes: day.notes?.trim() || null,
    stops: (day.stops ?? []).map((stop, stopIndex) => ({
      ...(stop.id && mongoose.Types.ObjectId.isValid(stop.id)
        ? { _id: new mongoose.Types.ObjectId(stop.id) }
        : {}),
      title: stop.title.trim(),
      notes: stop.notes?.trim() || null,
      startTime: stop.startTime?.trim() || null,
      reminderAt: stop.reminderAt ? new Date(stop.reminderAt) : null,
      reminderText: stop.reminderText?.trim() || null,
      completed: Boolean(stop.completed),
      order: stop.order ?? stopIndex,
    })),
    journal: day.journal
      ? {
          photos: day.journal.photos ?? [],
          memory: day.journal.memory?.trim() || null,
          mood: day.journal.mood ?? null,
          rating: day.journal.rating ?? null,
          places: (day.journal.places ?? []).map((place) => ({
            ...(place.id && mongoose.Types.ObjectId.isValid(place.id)
              ? { _id: new mongoose.Types.ObjectId(place.id) }
              : {}),
            name: place.name.trim(),
            note: place.note?.trim() || null,
            lat: place.lat ?? null,
            lng: place.lng ?? null,
          })),
        }
      : emptyJournal(),
  }));
}

/** Save the full itinerary, preserving journals the client omitted. */
export async function saveItinerary(
  userId: string,
  tripId: string,
  input: ItineraryUpdateInput
) {
  const trip = await findOwnedTrip(userId, tripId, "_id status startDate endDate");
  if (trip.status === "cancelled") {
    throw new AppError("Cannot edit a cancelled trip", 400, "CANCELLED");
  }

  // Preserve journals from DB when client omits them
  const stored = await loadTripDaysRaw(trip._id);
  const existing = ensureItineraryDays(
    stored?.days ?? [],
    trip.startDate,
    trip.endDate
  );
  const mapped = mapDaysFromInput(input.days).map((day, index) => {
    const prev = existing[index];
    const incomingJournal = day.journal;
    const hasIncoming =
      (incomingJournal?.photos?.length ?? 0) > 0 ||
      Boolean(incomingJournal?.memory) ||
      Boolean(incomingJournal?.mood) ||
      Boolean(incomingJournal?.rating) ||
      (incomingJournal?.places?.length ?? 0) > 0;

    return {
      ...day,
      journal: hasIncoming ? incomingJournal : prev?.journal ?? emptyJournal(),
    };
  });

  const savedDays = await saveTripDaysRaw(
    trip._id,
    mapped,
    trip.startDate,
    trip.endDate
  );

  return {
    tripId: String(trip._id),
    days: savedDays.map((day, index) => serializeItineraryDay(day, index)),
  };
}

export type SaveJournalEntryInput = {
  dayIndex?: number;
  date?: string;
  journal: {
    photos?: string[];
    memory?: string | null;
    mood?: string | null;
    rating?: number | null;
    places?: {
      id?: string;
      name: string;
      note?: string | null;
      lat?: number | null;
      lng?: number | null;
    }[];
  };
};

/** Save one day's field notes into the dedicated journal store. */
export async function saveJournalEntry(
  userId: string,
  tripId: string,
  input: SaveJournalEntryInput
) {
  const trip = await findOwnedTrip(userId, tripId, "_id status startDate endDate");
  if (trip.status === "cancelled") {
    throw new AppError("Cannot edit a cancelled trip", 400, "CANCELLED");
  }

  const stored = await loadTripDaysRaw(trip._id);
  const days = ensureItineraryDays(
    stored?.days ?? [],
    trip.startDate,
    trip.endDate
  );

  let targetIndex = typeof input.dayIndex === "number" ? input.dayIndex : -1;
  if (targetIndex < 0 && input.date) {
    const key = dayKey(input.date);
    targetIndex = days.findIndex((day) => dayKey(day.date) === key);
  }
  if (targetIndex < 0 || targetIndex >= days.length) {
    throw new AppError("Trip day not found", 404, "DAY_NOT_FOUND");
  }

  const targetDay = days[targetIndex]!;
  const key = dayKey(targetDay.date);

  const savedJournal = await upsertTripJournalEntry({
    tripId: trip._id,
    userId,
    dayKey: key,
    journal: {
      photos: input.journal.photos ?? [],
      memory: input.journal.memory ?? null,
      mood: input.journal.mood ?? null,
      rating: input.journal.rating ?? null,
      places: (input.journal.places ?? []).map((place) => ({
        id: place.id,
        name: place.name,
        note: place.note ?? null,
        lat: place.lat ?? null,
        lng: place.lng ?? null,
      })),
    },
  });

  const journalDays = await buildJournalDaysForTrip({
    tripId: trip._id,
    userId,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });

  return {
    tripId: String(trip._id),
    dayIndex: targetIndex,
    dayKey: key,
    journal: serializeStoredJournal(savedJournal),
    days: journalDays,
  };
}

/** Trip lookup used before accepting a journal photo upload. */
export async function getTripForJournalUpload(userId: string, tripId: string) {
  const trip = await findOwnedTrip(userId, tripId, "_id status");
  if (trip.status === "cancelled") {
    throw new AppError("Cannot upload to a cancelled trip", 400, "CANCELLED");
  }
  return trip;
}
