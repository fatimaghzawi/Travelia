import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { travelerCreateReviewSchema } from "@/validators/review.validator";
import { paginationSchema } from "@/validators/common";
import {
  getCurrentUser,
  requireAdmin,
  requireTraveler,
} from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { sanitizeInput } from "@/lib/security/sanitize";
import { ROLES } from "@/lib/constants/roles";
import { notifyUser } from "@/lib/notifications/notify";
import {
  createReview,
  listAdminReviews,
  listMyReviews,
  listPublicReviews,
} from "@/lib/reviews/queries";

/**
 * GET /api/reviews
 * - `public=1&destinationId=` → approved reviews for a destination (no auth)
 * - traveler (default) → own reviews
 * - admin → full moderation list (legacy shape)
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);
  const isPublic =
    params.public === "1" ||
    params.public === "true" ||
    params.scope === "public";

  if (isPublic) {
    if (!params.destinationId || !mongoose.isValidObjectId(params.destinationId)) {
      throw new AppError("destinationId is required", 400, "VALIDATION_ERROR");
    }
    const { items, total } = await listPublicReviews(params.destinationId, {
      page: query.page,
      limit: query.limit,
    });
    return ok(items, "Reviews", buildMeta(total, query.page, query.limit));
  }

  const user = await getCurrentUser();
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  if (user.role === ROLES.ADMIN && params.mine !== "1" && params.mine !== "true") {
    await requireAdmin();
    const { items, total } = await listAdminReviews({
      isApproved: params.isApproved,
      destinationId: params.destinationId,
      rating: params.rating,
      page: query.page,
      limit: query.limit,
    });
    return ok(items, "Reviews", buildMeta(total, query.page, query.limit));
  }

  await requireTraveler();
  const { items, total } = await listMyReviews({
    userId: user.id,
    destinationId: params.destinationId,
    tripId: params.tripId,
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Your reviews", buildMeta(total, query.page, query.limit));
});

/**
 * POST /api/reviews — traveler review after a completed trip.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireTraveler();
  const raw = sanitizeInput(await request.json());
  const input = travelerCreateReviewSchema.parse(raw);

  const { review, reviewId, rating, destTitle } = await createReview(
    user.id,
    input
  );

  await notifyUser({
    userId: user.id,
    title: "Review submitted",
    message: `Your ${rating}-star review of ${destTitle} is pending moderation. We'll publish it once approved.`,
    type: "reminder",
    link: "/dashboard/reviews",
    relatedId: reviewId,
    emailSubject: `Review received · ${destTitle}`,
    ctaLabel: "View reviews",
  }).catch(() => undefined);

  return ok(review, "Review submitted for moderation");
});
