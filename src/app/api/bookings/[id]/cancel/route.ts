import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { objectIdSchema } from "@/validators/common";
import { requireTraveler } from "@/lib/auth/session";
import { notifyUser } from "@/lib/notifications/notify";
import { cancelBooking } from "@/lib/booking/cancel";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler(async (_request: NextRequest, context) => {
  const sessionUser = await requireTraveler();
  const { id } = await (context as Ctx).params;

  const { booking, cancelledIds, cancelledActivities } = await cancelBooking(
    objectIdSchema.parse(id),
    sessionUser.id
  );

  await notifyUser({
    userId: booking.userId,
    title: "Booking cancelled",
    message:
      cancelledActivities > 0
        ? `Your booking was cancelled along with ${cancelledActivities} linked ${
            cancelledActivities === 1 ? "activity" : "activities"
          }.`
        : "Your booking was cancelled successfully.",
    type: "booking",
    link: "/dashboard/bookings",
    relatedId: booking._id,
    emailSubject: "Booking cancelled · Travelia",
    ctaLabel: "View bookings",
  }).catch(() => undefined);

  return ok(
    {
      id: String(booking._id),
      status: "cancelled",
      cancelledIds,
      cancelledActivities,
    },
    cancelledActivities > 0
      ? `Booking cancelled · ${cancelledActivities} linked ${
          cancelledActivities === 1 ? "activity" : "activities"
        } cancelled`
      : "Booking cancelled"
  );
});
