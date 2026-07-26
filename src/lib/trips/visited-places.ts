import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Destination, Trip, TripJournal, VisitedPlace } from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";

export type VisitedMapPin = {
  id: string;
  kind: "destination" | "spot";
  name: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  visitDate: string | null;
  tripId: string | null;
  tripTitle: string | null;
  destinationId: string | null;
  thumbnail: string | null;
  note: string | null;
  rating: number | null;
};

/** Approximate coords when destinations were seeded without lat/lng. */
const PLACE_FALLBACKS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  tokyo: [35.6762, 139.6503],
  santorini: [36.3932, 25.4615],
  oia: [36.4618, 25.3753],
  bali: [-8.3405, 115.092],
  london: [51.5072, -0.1276],
  rome: [41.9028, 12.4964],
  dubai: [25.2048, 55.2708],
  "new york": [40.7128, -74.006],
  cairo: [30.0444, 31.2357],
  sydney: [-33.8688, 151.2093],
  bangkok: [13.7563, 100.5018],
  barcelona: [41.3874, 2.1686],
  istanbul: [41.0082, 28.9784],
  maldives: [3.2028, 73.2207],
  positano: [40.628, 14.4849],
  "amalfi coast": [40.634, 14.6027],
  amalfi: [40.6344, 14.6026],
  greece: [39.0742, 21.8243],
  italy: [41.8719, 12.5674],
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function hasCoords(lat?: number | null, lng?: number | null) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function fallbackCoords(
  ...labels: Array<string | null | undefined>
): { lat: number; lng: number } | null {
  for (const raw of labels) {
    const key = raw?.toLowerCase().trim();
    if (!key) continue;
    const hit = PLACE_FALLBACKS[key];
    if (hit) return { lat: hit[0], lng: hit[1] };
  }
  return null;
}

const geocodeMemory = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLabel(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const cacheKey = q.toLowerCase();
  if (geocodeMemory.has(cacheKey)) {
    return geocodeMemory.get(cacheKey) ?? null;
  }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", q);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "TraveliaVisitedMap/1.0 (https://travelia.app)",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) {
      geocodeMemory.set(cacheKey, null);
      return null;
    }
    const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = json[0];
    if (!hit?.lat || !hit?.lon) {
      geocodeMemory.set(cacheKey, null);
      return null;
    }
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      geocodeMemory.set(cacheKey, null);
      return null;
    }
    const coords = { lat, lng };
    geocodeMemory.set(cacheKey, coords);
    return coords;
  } catch {
    return null;
  }
}

async function resolveCoords(opts: {
  lat?: unknown;
  lng?: unknown;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  name?: string | null;
  context?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const lat = asNumber(opts.lat);
  const lng = asNumber(opts.lng);
  if (hasCoords(lat, lng)) return { lat: lat!, lng: lng! };

  const fromFallback = fallbackCoords(
    opts.name,
    opts.title,
    opts.city,
    opts.country,
    [opts.city, opts.country].filter(Boolean).join(", "),
    [opts.title, opts.country].filter(Boolean).join(", ")
  );
  if (fromFallback) return fromFallback;

  const query = [
    opts.name,
    opts.title,
    opts.city,
    opts.country,
    opts.context,
  ]
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return geocodeLabel(query);
}

/**
 * Load every place the traveler visited across trips:
 * - destination VisitedPlace rows
 * - journal “visited places” pins (geocoded if needed)
 */
export async function loadVisitedMapPins(
  userId: string
): Promise<VisitedMapPin[]> {
  await connectDB();
  try {
    await syncTravelerTrips(userId);
  } catch (error) {
    console.warn("[visited] syncTravelerTrips skipped", error);
  }

  const uid = new mongoose.Types.ObjectId(userId);
  const pins: VisitedMapPin[] = [];
  const seen = new Set<string>();

  const [visits, trips, journals] = await Promise.all([
    VisitedPlace.find({ userId: uid })
      .populate(
        "destinationId",
        "title city country thumbnail latitude longitude"
      )
      .populate("tripId", "title")
      .sort({ visitDate: -1 })
      .lean(),
    Trip.find({
      userId: uid,
      status: { $ne: "cancelled" },
    })
      .select("_id title destinationId status")
      .lean(),
    TripJournal.find({ userId: uid }).lean(),
  ]);

  const tripById = new Map(
    trips.map((t) => [
      String(t._id),
      {
        title: t.title || "Trip",
        destinationId: t.destinationId ? String(t.destinationId) : null,
        status: t.status,
      },
    ])
  );

  // Destination context helps geocode free-text journal places
  const destLabelByTrip = new Map<string, string>();
  const destIds = [
    ...new Set(
      trips
        .map((t) => (t.destinationId ? String(t.destinationId) : null))
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (destIds.length > 0) {
    const destDocs = await Destination.find({
      _id: { $in: destIds },
    })
      .select("title city country")
      .lean();
    const destById = new Map(
      destDocs.map((d) => [
        String(d._id),
        [d.city, d.country, d.title].filter(Boolean).join(", "),
      ])
    );
    for (const trip of trips) {
      if (!trip.destinationId) continue;
      const label = destById.get(String(trip.destinationId));
      if (label) destLabelByTrip.set(String(trip._id), label);
    }
  }

  for (const visit of visits) {
    let dest = visit.destinationId as unknown as {
      _id?: unknown;
      title?: string;
      city?: string;
      country?: string;
      thumbnail?: string | null;
      latitude?: unknown;
      longitude?: unknown;
    } | null;

    // Populate can fail if destinationId is a bare ObjectId
    if (!dest || !("title" in dest)) {
      const rawId =
        dest && typeof dest === "object" && "_id" in dest
          ? dest._id
          : visit.destinationId;
      if (!rawId) continue;
      dest = (await Destination.findById(rawId)
        .select("title city country thumbnail latitude longitude")
        .lean()) as typeof dest;
    }
    if (!dest?._id) continue;

    const destinationId = String(dest._id);
    const coords = await resolveCoords({
      lat: dest.latitude,
      lng: dest.longitude,
      title: dest.title,
      city: dest.city,
      country: dest.country,
    });
    if (!coords) continue;

    // Persist resolved coords so later loads stay fast
    if (!hasCoords(asNumber(dest.latitude), asNumber(dest.longitude))) {
      await Destination.findByIdAndUpdate(dest._id, {
        latitude: coords.lat,
        longitude: coords.lng,
      }).catch(() => undefined);
    }

    const tripPop = visit.tripId as unknown as {
      _id?: unknown;
      title?: string;
    } | null;
    const tripId = tripPop?._id
      ? String(tripPop._id)
      : visit.tripId
        ? String(visit.tripId)
        : null;
    const key = `dest:${destinationId}:${tripId ?? "none"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    pins.push({
      id: key,
      kind: "destination",
      name: dest.title || "Destination",
      subtitle: [dest.city, dest.country].filter(Boolean).join(", ") || null,
      lat: coords.lat,
      lng: coords.lng,
      visitDate: visit.visitDate
        ? new Date(visit.visitDate).toISOString()
        : null,
      tripId,
      tripTitle:
        tripPop?.title ||
        (tripId ? tripById.get(tripId)?.title ?? null : null),
      destinationId,
      thumbnail: dest.thumbnail ?? null,
      note: visit.note ?? null,
      rating: typeof visit.rating === "number" ? visit.rating : null,
    });
  }

  // Journal field pins — include every place; geocode when lat/lng missing
  for (const entry of journals) {
    const tripId = String(entry.tripId);
    const tripMeta = tripById.get(tripId);
    const tripTitle = tripMeta?.title ?? "Trip";
    const context = destLabelByTrip.get(tripId) || "";
    let dirty = false;
    const nextPlaces = [...(entry.places ?? [])];

    for (let i = 0; i < nextPlaces.length; i++) {
      const place = nextPlaces[i]!;
      const coords = await resolveCoords({
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        context,
      });
      if (!coords) continue;

      if (!hasCoords(asNumber(place.lat), asNumber(place.lng))) {
        nextPlaces[i] = { ...place, lat: coords.lat, lng: coords.lng };
        dirty = true;
      }

      const placeId = place._id
        ? String(place._id)
        : `${place.name}:${coords.lat}:${coords.lng}`;
      const key = `spot:${tripId}:${placeId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pins.push({
        id: key,
        kind: "spot",
        name: place.name,
        subtitle: entry.dayKey
          ? `${tripTitle} · ${entry.dayKey}`
          : tripTitle,
        lat: coords.lat,
        lng: coords.lng,
        visitDate: entry.dayKey
          ? new Date(`${entry.dayKey}T12:00:00.000Z`).toISOString()
          : null,
        tripId,
        tripTitle,
        destinationId: tripMeta?.destinationId ?? null,
        thumbnail: null,
        note: place.note ?? null,
        rating: null,
      });
    }

    if (dirty) {
      await TripJournal.updateOne(
        { _id: entry._id },
        { $set: { places: nextPlaces } }
      ).catch((error) =>
        console.warn("[visited] could not persist geocoded journal pins", error)
      );
    }
  }

  // Destinations on trips without a VisitedPlace row yet
  for (const trip of trips) {
    if (!trip.destinationId) continue;
    if (trip.status !== "ongoing" && trip.status !== "completed") continue;
    const destinationId = String(trip.destinationId);
    const already = [...seen].some((k) =>
      k.startsWith(`dest:${destinationId}:`)
    );
    if (already) continue;

    const dest = await Destination.findById(trip.destinationId)
      .select("title city country thumbnail latitude longitude")
      .lean();
    if (!dest) continue;

    const coords = await resolveCoords({
      lat: dest.latitude,
      lng: dest.longitude,
      title: dest.title,
      city: dest.city,
      country: dest.country,
    });
    if (!coords) continue;

    if (!hasCoords(asNumber(dest.latitude), asNumber(dest.longitude))) {
      await Destination.findByIdAndUpdate(dest._id, {
        latitude: coords.lat,
        longitude: coords.lng,
      }).catch(() => undefined);
    }

    const tripId = String(trip._id);
    const key = `dest:${destinationId}:${tripId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({
      id: key,
      kind: "destination",
      name: dest.title,
      subtitle: [dest.city, dest.country].filter(Boolean).join(", ") || null,
      lat: coords.lat,
      lng: coords.lng,
      visitDate: null,
      tripId,
      tripTitle: trip.title || "Trip",
      destinationId,
      thumbnail: dest.thumbnail ?? null,
      note: null,
      rating: null,
    });
  }

  pins.sort((a, b) => {
    const at = a.visitDate ? new Date(a.visitDate).getTime() : 0;
    const bt = b.visitDate ? new Date(b.visitDate).getTime() : 0;
    return bt - at;
  });

  return pins;
}
