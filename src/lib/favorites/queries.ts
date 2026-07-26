import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Destination, Favorite } from "@/models";

export type ListFavoritesParams = {
  userId: string;
  page: number;
  limit: number;
};

export async function listFavorites(params: ListFavoritesParams) {
  await connectDB();
  const { userId, page, limit } = params;
  const filter = { userId };

  const [items, total] = await Promise.all([
    Favorite.find(filter)
      .populate(
        "destinationId",
        "title slug city country thumbnail estimatedBudget"
      )
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Favorite.countDocuments(filter),
  ]);

  return { items, total };
}

/** Toggle favorite — creates if missing, removes if present. */
export async function toggleFavorite(userId: string, destinationId: string) {
  await connectDB();

  const destination = await Destination.findById(destinationId);
  if (!destination || !destination.isPublished) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }

  const existing = await Favorite.findOne({ userId, destinationId });

  if (existing) {
    await existing.deleteOne();
    return { favorited: false, destinationId };
  }

  await Favorite.create({ userId, destinationId });
  return { favorited: true, destinationId };
}
