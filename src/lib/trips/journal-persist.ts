import mongoose from "mongoose";
import type { IDayJournal, ITripDay } from "@/models/trip.model";
import {
  ensureItineraryDays,
  normalizeJournal,
  startOfUtcDay,
} from "@/lib/trips/itinerary";

/** Read trip days from Mongo without Mongoose schema casting (avoids stripping journal). */
export async function loadTripDaysRaw(
  tripId: mongoose.Types.ObjectId | string
): Promise<{
  startDate: Date;
  endDate: Date;
  days: ITripDay[];
} | null> {
  const _id =
    typeof tripId === "string"
      ? new mongoose.Types.ObjectId(tripId)
      : tripId;

  const doc = await mongoose.connection.collection("trips").findOne(
    { _id },
    { projection: { days: 1, startDate: 1, endDate: 1 } }
  );

  if (!doc) return null;

  return {
    startDate: new Date(doc.startDate as Date),
    endDate: new Date(doc.endDate as Date),
    days: Array.isArray(doc.days) ? (doc.days as ITripDay[]) : [],
  };
}

function toBsonDays(days: ITripDay[]) {
  return days.map((day) => {
    const journal = normalizeJournal(day.journal as IDayJournal | null);
    const dayId =
      day._id && mongoose.Types.ObjectId.isValid(String(day._id))
        ? new mongoose.Types.ObjectId(String(day._id))
        : new mongoose.Types.ObjectId();

    return {
      _id: dayId,
      date: startOfUtcDay(day.date),
      notes: day.notes ?? null,
      stops: (day.stops ?? []).map((stop, index) => {
        const stopId =
          stop._id && mongoose.Types.ObjectId.isValid(String(stop._id))
            ? new mongoose.Types.ObjectId(String(stop._id))
            : new mongoose.Types.ObjectId();
        return {
          _id: stopId,
          title: String(stop.title ?? "").trim() || "Stop",
          notes: stop.notes ?? null,
          startTime: stop.startTime ?? null,
          reminderAt: stop.reminderAt ? new Date(stop.reminderAt) : null,
          reminderText: stop.reminderText ?? null,
          completed: Boolean(stop.completed),
          order: typeof stop.order === "number" ? stop.order : index,
        };
      }),
      journal: {
        photos: journal.photos.filter(
          (url) => typeof url === "string" && !url.startsWith("blob:")
        ),
        memory: journal.memory,
        mood: journal.mood,
        rating: journal.rating,
        places: journal.places.map((place) => {
          const placeId =
            place._id && mongoose.Types.ObjectId.isValid(String(place._id))
              ? new mongoose.Types.ObjectId(String(place._id))
              : new mongoose.Types.ObjectId();
          return {
            _id: placeId,
            name: place.name,
            note: place.note ?? null,
            lat: place.lat ?? null,
            lng: place.lng ?? null,
          };
        }),
      },
    };
  });
}

/**
 * Persist full days array (including journal) via native driver.
 * Returns the days as stored/normalized for the trip window.
 */
export async function saveTripDaysRaw(
  tripId: mongoose.Types.ObjectId | string,
  days: ITripDay[],
  startDate: Date,
  endDate: Date
): Promise<ITripDay[]> {
  const _id =
    typeof tripId === "string"
      ? new mongoose.Types.ObjectId(tripId)
      : tripId;

  const normalized = ensureItineraryDays(days, startDate, endDate);
  const bsonDays = toBsonDays(normalized);

  const result = await mongoose.connection.collection("trips").updateOne(
    { _id },
    {
      $set: {
        days: bsonDays,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw new Error("Trip not found while saving journal days");
  }

  const fresh = await loadTripDaysRaw(_id);
  return ensureItineraryDays(
    fresh?.days ?? normalized,
    startDate,
    endDate
  );
}

/**
 * Ensure every calendar day exists without wiping journal fields.
 * Uses raw BSON read/write so Mongoose casting cannot strip journal.
 */
export async function ensureTripDaysPersisted(
  tripId: mongoose.Types.ObjectId | string,
  startDate: Date,
  endDate: Date
): Promise<ITripDay[]> {
  const raw = await loadTripDaysRaw(tripId);
  const existing = raw?.days ?? [];
  const scaffolded = ensureItineraryDays(existing, startDate, endDate);

  const needsWrite = existing.length !== scaffolded.length;

  if (needsWrite) {
    return saveTripDaysRaw(tripId, scaffolded, startDate, endDate);
  }

  return scaffolded;
}
