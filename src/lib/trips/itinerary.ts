import type {
  IDayJournal,
  IItineraryStop,
  IJournalPlace,
  ITripDay,
} from "@/models/trip.model";

/** Stable calendar key in UTC (avoids timezone day shifts). */
export function dayKey(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "invalid";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfUtcDay(value: Date | string = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export function emptyJournal(): IDayJournal {
  return {
    photos: [],
    memory: null,
    mood: null,
    rating: null,
    places: [],
  };
}

export function normalizeJournal(journal?: IDayJournal | null): IDayJournal {
  if (!journal) return emptyJournal();
  const rawPhotos = journal.photos as unknown;
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos.map(String).map((p) => p.trim()).filter(Boolean)
    : rawPhotos && typeof (rawPhotos as { length?: number }).length === "number"
      ? Array.from(rawPhotos as ArrayLike<unknown>)
          .map(String)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
  const mood =
    typeof journal.mood === "string" && journal.mood.trim()
      ? journal.mood.trim()
      : null;
  const ratingRaw = journal.rating;
  const rating =
    typeof ratingRaw === "number" &&
    Number.isFinite(ratingRaw) &&
    ratingRaw >= 1
      ? Math.min(5, Math.round(ratingRaw))
      : null;

  return {
    photos,
    memory:
      typeof journal.memory === "string" && journal.memory.trim()
        ? journal.memory.trim()
        : null,
    mood,
    rating,
    places: Array.isArray(journal.places)
      ? journal.places
          .filter((place) => place && typeof place.name === "string")
          .map((place) => ({
            ...(place._id ? { _id: place._id } : {}),
            name: String(place.name).trim(),
            note:
              typeof place.note === "string" && place.note.trim()
                ? place.note.trim()
                : null,
            lat:
              typeof place.lat === "number" && Number.isFinite(place.lat)
                ? place.lat
                : null,
            lng:
              typeof place.lng === "number" && Number.isFinite(place.lng)
                ? place.lng
                : null,
          }))
      : [],
  };
}

/**
 * Ensure one itinerary day exists for every UTC calendar day between start and end.
 * Preserves existing stops, notes, and journal entries.
 */
export function ensureItineraryDays(
  days: ITripDay[] | null | undefined,
  startDate: Date,
  endDate: Date
): ITripDay[] {
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const byKey = new Map<string, ITripDay>();

  for (const day of days ?? []) {
    const key = dayKey(day.date);
    if (key === "invalid") continue;
    byKey.set(key, {
      ...(day._id ? { _id: day._id } : {}),
      date: startOfUtcDay(day.date),
      stops: [...(day.stops ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
      notes: day.notes ?? null,
      journal: normalizeJournal(
        day.journal && typeof day.journal === "object"
          ? (day.journal as IDayJournal)
          : null
      ),
    });
  }

  const result: ITripDay[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 60) {
    const key = dayKey(cursor);
    const existing = byKey.get(key);
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        date: new Date(cursor),
        stops: [],
        notes: null,
        journal: emptyJournal(),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }

  return result;
}

export function serializeJournalPlace(place: IJournalPlace, index: number) {
  return {
    id: place._id ? String(place._id) : `place-${index}`,
    name: place.name,
    note: place.note ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
  };
}

export function serializeJournal(journal?: IDayJournal | null) {
  const j = normalizeJournal(journal);
  return {
    photos: j.photos,
    memory: j.memory ?? null,
    mood: j.mood ?? null,
    rating: j.rating ?? null,
    places: j.places.map((place, index) =>
      serializeJournalPlace(place, index)
    ),
  };
}

export function serializeItineraryDay(day: ITripDay, index: number) {
  return {
    id: day._id ? String(day._id) : `day-${index}`,
    dayNumber: index + 1,
    date: startOfUtcDay(day.date).toISOString(),
    notes: day.notes ?? null,
    stops: (day.stops ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((stop, stopIndex) => serializeItineraryStop(stop, stopIndex)),
    journal: serializeJournal(day.journal),
  };
}

export function serializeItineraryStop(stop: IItineraryStop, index: number) {
  return {
    id: stop._id ? String(stop._id) : `stop-${index}-${stop.title}`,
    title: stop.title,
    notes: stop.notes ?? null,
    startTime: stop.startTime ?? null,
    reminderAt: stop.reminderAt
      ? new Date(stop.reminderAt).toISOString()
      : null,
    reminderText: stop.reminderText ?? null,
    completed: Boolean(stop.completed),
    order: typeof stop.order === "number" ? stop.order : index,
  };
}
