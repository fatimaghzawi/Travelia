import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Review, Trip, Destination } from "@/models";
import { recomputeDestinationRating } from "@/lib/reviews/rating";
import type {
  TravelerCreateReviewInput,
  TravelerUpdateReviewInput,
  UpdateReviewInput,
} from "@/validators/review.validator";

export function serializeReview(doc: {
  _id: unknown;
  rating: number;
  comment?: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  tripId?: unknown;
  userId?: unknown;
  destinationId?: unknown;
}) {
  const user =
    doc.userId && typeof doc.userId === "object"
      ? (doc.userId as {
          _id?: unknown;
          firstName?: string;
          lastName?: string;
          image?: string | null;
        })
      : null;
  const destination =
    doc.destinationId && typeof doc.destinationId === "object"
      ? (doc.destinationId as {
          _id?: unknown;
          title?: string;
          city?: string;
          country?: string;
          thumbnail?: string | null;
          slug?: string;
        })
      : null;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      "Traveler"
    : "Traveler";

  return {
    id: String(doc._id),
    rating: doc.rating,
    comment: doc.comment ?? null,
    isApproved: doc.isApproved,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
    tripId: doc.tripId ? String(doc.tripId) : null,
    user: user
      ? {
          id: String(user._id),
          name: displayName,
          image: user.image ?? null,
        }
      : null,
    destination: destination
      ? {
          id: String(destination._id),
          title: destination.title ?? "Destination",
          city: destination.city ?? null,
          country: destination.country ?? null,
          thumbnail: destination.thumbnail ?? null,
          slug: destination.slug ?? null,
        }
      : doc.destinationId
        ? { id: String(doc.destinationId) }
        : null,
  };
}

export type PageParams = { page: number; limit: number };

/** Approved reviews for a destination — public (no auth). */
export async function listPublicReviews(
  destinationId: string,
  { page, limit }: PageParams
) {
  await connectDB();
  const filter = { destinationId, isApproved: true };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate("userId", "firstName lastName image")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializeReview(item as never)), total };
}

export type AdminReviewFilter = {
  isApproved?: string;
  destinationId?: string;
  rating?: string;
};

/** Full moderation list for admins (legacy shape — hydrated docs). */
export async function listAdminReviews(
  params: AdminReviewFilter & PageParams
) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (params.isApproved) filter.isApproved = params.isApproved === "true";
  if (params.destinationId) filter.destinationId = params.destinationId;
  if (params.rating) filter.rating = Number(params.rating);

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate("userId", "firstName lastName email image")
      .populate("destinationId", "title city country thumbnail slug")
      .sort("-createdAt")
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export type MyReviewFilter = { userId: string; destinationId?: string; tripId?: string };

/** A traveler's own reviews. */
export async function listMyReviews(params: MyReviewFilter & PageParams) {
  await connectDB();
  const filter: Record<string, unknown> = { userId: params.userId };
  if (params.destinationId) filter.destinationId = params.destinationId;
  if (params.tripId) filter.tripId = params.tripId;

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate("destinationId", "title city country thumbnail slug")
      .sort("-createdAt")
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializeReview(item as never)), total };
}

/** Traveler review after a completed trip. */
export async function createReview(
  userId: string,
  input: TravelerCreateReviewInput
) {
  await connectDB();

  const destination = await Destination.findById(input.destinationId)
    .select("_id title")
    .lean();
  if (!destination) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }

  const trip = await Trip.findOne({
    _id: input.tripId,
    userId,
    destinationId: input.destinationId,
    status: "completed",
  })
    .select("_id")
    .lean();

  if (!trip) {
    throw new AppError(
      "You can review a destination only after completing a trip there",
      403,
      "FORBIDDEN"
    );
  }

  const existing = await Review.findOne({
    userId,
    destinationId: input.destinationId,
  })
    .select("_id")
    .lean();
  if (existing) {
    throw new AppError(
      "You already reviewed this destination",
      409,
      "DUPLICATE"
    );
  }

  const review = await Review.create({
    userId,
    destinationId: input.destinationId,
    tripId: input.tripId,
    rating: input.rating,
    comment: input.comment?.trim() || undefined,
    images: [],
    isApproved: false,
  });

  // Ratings update only after admin approval

  const populated = await Review.findById(review._id)
    .populate("destinationId", "title city country thumbnail slug")
    .lean();

  const destTitle =
    populated?.destinationId &&
    typeof populated.destinationId === "object" &&
    "title" in populated.destinationId
      ? String(
          (populated.destinationId as { title?: string }).title || "destination"
        )
      : "destination";

  return {
    review: serializeReview((populated ?? review.toObject()) as never),
    reviewId: review._id,
    rating: review.rating,
    destTitle,
  };
}

/** Admin moderation update — approve/reject/edit; recomputes rating. */
export async function updateReviewAsAdmin(
  reviewId: string,
  input: UpdateReviewInput
) {
  await connectDB();
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");

  const wasApproved = review.isApproved;
  Object.assign(review, input);
  await review.save();
  await recomputeDestinationRating(review.destinationId.toString());

  return { review, becameApproved: !wasApproved && review.isApproved };
}

/** Traveler edits their own review — goes back to moderation. */
export async function updateReviewAsTraveler(
  reviewId: string,
  userId: string,
  input: TravelerUpdateReviewInput
) {
  await connectDB();
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");

  if (String(review.userId) !== userId) {
    throw new AppError("You can only edit your own review", 403, "FORBIDDEN");
  }

  if (input.rating !== undefined) review.rating = input.rating;
  if (input.comment !== undefined) {
    review.comment = input.comment?.trim() || undefined;
  }
  // Edits go back to moderation so public ratings stay accurate
  review.isApproved = false;
  await review.save();

  return review;
}

export async function deleteReviewAsAdmin(reviewId: string) {
  await connectDB();
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");

  const destinationId = review.destinationId.toString();
  await review.deleteOne();
  await recomputeDestinationRating(destinationId);
}

export async function deleteReviewAsTraveler(reviewId: string, userId: string) {
  await connectDB();
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");

  if (String(review.userId) !== userId) {
    throw new AppError("You can only delete your own review", 403, "FORBIDDEN");
  }

  const destinationId = review.destinationId.toString();
  await review.deleteOne();
  await recomputeDestinationRating(destinationId);
}
