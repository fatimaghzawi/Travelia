import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Category, Destination, Trip, TripJournal } from "@/models";

export type GalleryPhoto = {
  id: string;
  url: string;
  tripId: string;
  tripTitle: string;
  destinationId: string | null;
  destinationTitle: string | null;
  city: string | null;
  country: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  dayKey: string | null;
  dayLabel: string | null;
  createdAt: string;
};

/**
 * Collect every journal photo the traveler uploaded across all trips.
 */
export async function loadTravelerGallery(
  userId: string
): Promise<GalleryPhoto[]> {
  await connectDB();
  const uid = new mongoose.Types.ObjectId(userId);

  const [journals, trips] = await Promise.all([
    TripJournal.find({ userId: uid })
      .select("tripId dayKey photos createdAt updatedAt")
      .sort("-updatedAt")
      .lean(),
    Trip.find({ userId: uid, status: { $ne: "cancelled" } })
      .select("_id title destinationId")
      .lean(),
  ]);

  const destIds = [
    ...new Set(
      trips
        .map((t) => t.destinationId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const destinations = destIds.length
    ? await Destination.find({ _id: { $in: destIds } })
        .select("_id title city country categoryId")
        .lean()
    : [];

  const categoryIds = [
    ...new Set(
      destinations
        .map((d) => d.categoryId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const categories = categoryIds.length
    ? await Category.find({ _id: { $in: categoryIds } })
        .select("_id name slug")
        .lean()
    : [];

  const categoryById = new Map(
    categories.map((c) => [
      String(c._id),
      { name: c.name || null, slug: c.slug || null },
    ])
  );

  const destById = new Map(
    destinations.map((d) => {
      const cat = d.categoryId
        ? categoryById.get(String(d.categoryId))
        : null;
      return [
        String(d._id),
        {
          title: d.title || null,
          city: d.city || null,
          country: d.country || null,
          categorySlug: cat?.slug ?? null,
          categoryName: cat?.name ?? null,
        },
      ] as const;
    })
  );

  const tripMeta = new Map(
    trips.map((t) => {
      const dest = t.destinationId
        ? destById.get(String(t.destinationId))
        : null;
      return [
        String(t._id),
        {
          title: t.title || "Trip",
          destinationId: t.destinationId ? String(t.destinationId) : null,
          destinationTitle: dest?.title ?? null,
          city: dest?.city ?? null,
          country: dest?.country ?? null,
          categorySlug: dest?.categorySlug ?? null,
          categoryName: dest?.categoryName ?? null,
        },
      ] as const;
    })
  );

  const photos: GalleryPhoto[] = [];
  const seen = new Set<string>();

  for (const entry of journals) {
    const tripId = String(entry.tripId);
    const meta = tripMeta.get(tripId);
    const title = meta?.title || "Trip";
    const dayKey = entry.dayKey || null;
    let dayLabel: string | null = null;
    if (dayKey) {
      const d = new Date(`${dayKey}T12:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) {
        dayLabel = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }

    const urls = Array.isArray(entry.photos) ? entry.photos : [];
    for (let i = 0; i < urls.length; i++) {
      const url = String(urls[i] || "").trim();
      if (!url || url.startsWith("blob:")) continue;
      const key = `${tripId}:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);

      photos.push({
        id: `${String(entry._id)}-${i}`,
        url,
        tripId,
        tripTitle: title,
        destinationId: meta?.destinationId ?? null,
        destinationTitle: meta?.destinationTitle ?? null,
        city: meta?.city ?? null,
        country: meta?.country ?? null,
        categorySlug: meta?.categorySlug ?? null,
        categoryName: meta?.categoryName ?? null,
        dayKey,
        dayLabel,
        createdAt: new Date(
          entry.updatedAt || entry.createdAt || Date.now()
        ).toISOString(),
      });
    }
  }

  photos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return photos;
}
