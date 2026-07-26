import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateBookingSchema } from "@/validators/booking.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { getBookingForAdmin, updateBookingAsAdmin } from "@/lib/booking/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const booking = await getBookingForAdmin(objectIdSchema.parse(id));
  return ok(booking, "Booking");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateBookingSchema.parse(raw);

  const booking = await updateBookingAsAdmin(objectIdSchema.parse(id), input);

  return ok(booking, "Booking updated");
});
