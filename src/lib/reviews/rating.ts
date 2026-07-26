import mongoose from "mongoose";
import { Destination, Review } from "@/models";

/** Recompute destination aggregate rating from approved reviews. */
export async function recomputeDestinationRating(destinationId: string) {
  if (!mongoose.isValidObjectId(destinationId)) return;

  const stats = await Review.aggregate([
    {
      $match: {
        destinationId: new mongoose.Types.ObjectId(destinationId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$destinationId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const { avg = 0, count = 0 } = stats[0] ?? {};
  await Destination.findByIdAndUpdate(destinationId, {
    ratingAverage: Math.round(avg * 10) / 10,
    reviewCount: count,
  });
}
