import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { buildMeta } from "@/lib/api/pagination";
import { sanitizeInput } from "@/lib/security/sanitize";
import {
  requireAdmin,
  requireAuth,
  requireTraveler,
} from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import { objectIdSchema, paginationSchema } from "@/validators/common";
import { z } from "zod";
import { notifyUser } from "@/lib/notifications/notify";
import { createBooking } from "@/lib/booking/create";
import { listBookings } from "@/lib/booking/queries";

const travelerCreateBookingSchema = z
  .object({
    destinationId: objectIdSchema,
    /** Required for destination trip seats (hybrid packages). */
    tripPackageId: objectIdSchema.optional().nullable(),
    activityId: objectIdSchema.optional().nullable(),
    usePassportDetails: z.boolean().default(false),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => Boolean(data.tripPackageId), {
    message: "Select a trip package to book",
    path: ["tripPackageId"],
  })
  .refine(
    (data) => !data.activityId || Boolean(data.tripPackageId),
    {
      message: "Experiences can only be booked with a trip package",
      path: ["activityId"],
    }
  );

export const POST = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireTraveler();

  const raw = sanitizeInput(await request.json());
  const input = travelerCreateBookingSchema.parse(raw);

  const { booking, destinationTitle } = await createBooking(
    sessionUser.id,
    input
  );

  await notifyUser({
    userId: sessionUser.id,
    title: "Booking created",
    message: `Your booking for ${destinationTitle} is ready. Complete payment to confirm your seat.`,
    type: "booking",
    link: "/dashboard/bookings",
    relatedId: booking._id,
    emailSubject: `Booking created · ${destinationTitle}`,
    ctaLabel: "View booking",
  }).catch(() => undefined);

  return ok(booking, "Booking created");
});

export const GET = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireAuth();

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);

  if (sessionUser.role === ROLES.ADMIN) {
    await requireAdmin();
  } else {
    await requireTraveler();
  }

  const { items, total } = await listBookings(sessionUser, {
    status: params.status,
    paymentStatus: params.paymentStatus,
    userId:
      sessionUser.role === ROLES.ADMIN && params.userId
        ? objectIdSchema.parse(params.userId)
        : undefined,
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Bookings", buildMeta(total, query.page, query.limit));
});
