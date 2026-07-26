import mongoose from "mongoose";
import { TripJournal } from "@/models";
import type { IDayJournal, ITripDay } from "@/models/trip.model";
import {
  dayKey,
  ensureItineraryDays,
  normalizeJournal,
  serializeJournal,
  serializeItineraryDay,
} from "@/lib/trips/itinerary";
import {
  ensureTripDaysPersisted,
  loadTripDaysRaw,
} from "@/lib/trips/journal-persist";

export type JournalPayload = {
  photos: string[];
  memory: string | null;
  mood: string | null;
  rating: number | null;
  places: {
    id?: string;
    name: string;
    note?: string | null;
    lat?: number | null;
    lng?: number | null;
  }[];
};

function toJournalDoc(payload: JournalPayload): IDayJournal {
  return normalizeJournal({
    photos: (payload.photos ?? [])
      .map(String)
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith("blob:")),
    memory: payload.memory ?? null,
    mood: payload.mood ?? null,
    rating: payload.rating ?? null,
    places: (payload.places ?? []).map((place) => ({
      ...(place.id && mongoose.Types.ObjectId.isValid(place.id)
        ? { _id: new mongoose.Types.ObjectId(place.id) }
        : {}),
      name: place.name,
      note: place.note ?? null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    })),
  });
}

function journalHasContent(journal: IDayJournal) {
  return (
    journal.photos.length > 0 ||
    Boolean(journal.memory) ||
    Boolean(journal.mood) ||
    Boolean(journal.rating) ||
    journal.places.length > 0
  );
}

/** Upsert one day's field notes into the dedicated trip_journals collection. */
export async function upsertTripJournalEntry(input: {
  tripId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  dayKey: string;
  journal: JournalPayload;
}) {
  const tripId = new mongoose.Types.ObjectId(String(input.tripId));
  const userId = new mongoose.Types.ObjectId(String(input.userId));
  const key = input.dayKey;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error(`Invalid journal dayKey: ${key}`);
  }

  const journal = toJournalDoc(input.journal);

  const saved = await TripJournal.findOneAndUpdate(
    { tripId, dayKey: key },
    {
      $set: {
        userId,
        photos: journal.photos,
        memory: journal.memory,
        mood: journal.mood,
        rating: journal.rating,
        places: journal.places,
      },
      $setOnInsert: {
        tripId,
        dayKey: key,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  ).lean();

  return normalizeJournal({
    photos: saved?.photos ?? journal.photos,
    memory: saved?.memory ?? journal.memory,
    mood: saved?.mood ?? journal.mood,
    rating: saved?.rating ?? journal.rating,
    places: (saved?.places as IDayJournal["places"]) ?? journal.places,
  });
}

/** Load all field-note entries for a trip, keyed by UTC dayKey. */
export async function loadTripJournalMap(
  tripId: mongoose.Types.ObjectId | string
): Promise<Map<string, IDayJournal>> {
  const id = new mongoose.Types.ObjectId(String(tripId));
  const rows = await TripJournal.find({ tripId: id }).lean();
  const map = new Map<string, IDayJournal>();
  for (const row of rows) {
    map.set(
      String(row.dayKey),
      normalizeJournal({
        photos: row.photos,
        memory: row.memory,
        mood: row.mood,
        rating: row.rating,
        places: row.places as IDayJournal["places"],
      })
    );
  }
  return map;
}

/**
 * Build serialized trip days with journals merged from trip_journals.
 * Also migrates any leftover nested days.journal into trip_journals once.
 */
export async function buildJournalDaysForTrip(input: {
  tripId: mongoose.Types.ObjectId | string;
  userId?: mongoose.Types.ObjectId | string;
  startDate: Date;
  endDate: Date;
  days?: ITripDay[] | null;
}) {
  await ensureTripDaysPersisted(input.tripId, input.startDate, input.endDate);

  const journalMap = await loadTripJournalMap(input.tripId);
  const raw = await loadTripDaysRaw(input.tripId);
  const scaffolded = ensureItineraryDays(
    raw?.days ?? input.days ?? [],
    input.startDate,
    input.endDate
  );

  // One-time migrate nested trip.days[].journal → trip_journals
  if (input.userId) {
    for (const day of scaffolded) {
      const key = dayKey(day.date);
      if (journalMap.has(key)) continue;
      const nested = normalizeJournal(day.journal);
      if (!journalHasContent(nested)) continue;
      const saved = await upsertTripJournalEntry({
        tripId: input.tripId,
        userId: input.userId,
        dayKey: key,
        journal: {
          photos: nested.photos,
          memory: nested.memory ?? null,
          mood: nested.mood ?? null,
          rating: nested.rating ?? null,
          places: nested.places.map((place) => ({
            id: place._id ? String(place._id) : undefined,
            name: place.name,
            note: place.note ?? null,
            lat: place.lat ?? null,
            lng: place.lng ?? null,
          })),
        },
      });
      journalMap.set(key, saved);
    }
  }

  return scaffolded.map((day, index) => {
    const key = dayKey(day.date);
    const fromStore = journalMap.get(key);
    const merged: ITripDay = {
      ...day,
      journal: fromStore ?? normalizeJournal(day.journal),
    };
    const serialized = serializeItineraryDay(merged, index);
    return {
      id: serialized.id,
      dayNumber: serialized.dayNumber,
      date: serialized.date,
      notes: serialized.notes,
      journal: serialized.journal,
    };
  });
}

export function serializeStoredJournal(journal: IDayJournal) {
  return serializeJournal(journal);
}
