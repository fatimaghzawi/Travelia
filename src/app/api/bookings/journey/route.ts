import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import { objectIdSchema } from "@/validators/common";
import { notifyUser } from "@/lib/notifications/notify";
import { createJourneyCheckout } from "@/lib/booking/journey";

const journeySchema = z
  .object({
    destinationId: objectIdSchema,
    tripPackageId: objectIdSchema.optional().nullable(),
    activityIds: z.array(objectIdSchema).max(20).default([]),
    usePassportDetails: z.boolean().default(false),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.tripPackageId) || data.activityIds.length > 0,
    {
      message: "Add a trip or at least one activity to your journey",
      path: ["activityIds"],
    }
  );

export const POST = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireTraveler();

  const raw = sanitizeInput(await request.json());
  const input = journeySchema.parse(raw);

  const result = await createJourneyCheckout(sessionUser, input);

  if (result.free) {
    await notifyUser({
      userId: sessionUser.id,
      title: "Journey reserved",
      message: `Your free journey to ${result.destinationTitle} is confirmed. Open My Trips to start planning.`,
      type: "booking",
      link: "/dashboard/bookings",
      relatedId: result.primaryBookingId,
      emailSubject: `Journey reserved · ${result.destinationTitle}`,
      ctaLabel: "View bookings",
    }).catch(() => undefined);

    return ok(
      {
        clientSecret: null,
        total: 0,
        bookingIds: result.bookingIds,
        free: true,
      },
      "Journey reserved"
    );
  }

  await notifyUser({
    userId: sessionUser.id,
    title: "Complete your payment",
    message: `Your journey to ${result.destinationTitle} is almost ready — finish checkout to lock your seats.`,
    type: "booking",
    link: "/dashboard/bookings",
    relatedId: result.paymentId,
    emailSubject: `Complete payment · ${result.destinationTitle}`,
    ctaLabel: "View bookings",
  }).catch(() => undefined);

  return ok(
    {
      clientSecret: result.clientSecret,
      sessionId: result.sessionId,
      total: result.total,
      bookingIds: result.bookingIds,
      free: false,
    },
    "Journey checkout created"
  );
});
