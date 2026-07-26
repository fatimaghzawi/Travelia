import type { NextRequest } from "next/server";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import {
  travelerUpdateReviewSchema,
  updateReviewSchema,
} from "@/validators/review.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { getCurrentUser, requireAdmin, requireTraveler } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import {
  deleteReviewAsAdmin,
  deleteReviewAsTraveler,
  updateReviewAsAdmin,
  updateReviewAsTraveler,
} from "@/lib/reviews/queries";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const reviewId = objectIdSchema.parse(id);
  const raw = sanitizeInput(await request.json());
  const user = await getCurrentUser();
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  if (user.role === ROLES.ADMIN) {
    await requireAdmin();
    const input = updateReviewSchema.parse(raw);
    const { review, becameApproved } = await updateReviewAsAdmin(
      reviewId,
      input
    );

    if (becameApproved) {
      const { notifyUser } = await import("@/lib/notifications/notify");
      await notifyUser({
        userId: review.userId,
        title: "Review published",
        message: "Your destination review was approved and is now live.",
        type: "reminder",
        link: "/dashboard/reviews",
        relatedId: review._id,
      }).catch(() => undefined);
    }

    return ok(review, "Review updated");
  }

  await requireTraveler();
  const input = travelerUpdateReviewSchema.parse(raw);
  const review = await updateReviewAsTraveler(reviewId, user.id, input);

  return ok(
    {
      id: String(review._id),
      rating: review.rating,
      comment: review.comment ?? null,
      isApproved: review.isApproved,
      destinationId: String(review.destinationId),
      tripId: review.tripId ? String(review.tripId) : null,
      updatedAt: review.updatedAt.toISOString(),
    },
    "Review updated — pending moderation"
  );
});

export const DELETE = apiHandler(async (request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const reviewId = objectIdSchema.parse(id);
  const user = await getCurrentUser();
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  if (user.role === ROLES.ADMIN) {
    await requireAdmin();
    await deleteReviewAsAdmin(reviewId);
  } else {
    await requireTraveler();
    await deleteReviewAsTraveler(reviewId, user.id);
  }

  return ok(null, "Review deleted");
});
