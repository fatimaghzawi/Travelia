import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import { objectIdSchema } from "@/validators/common";
import { createBookingCheckout } from "@/lib/payments/checkout";

const checkoutSchema = z.object({
  bookingId: objectIdSchema,
});

export const POST = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireTraveler();

  const raw = sanitizeInput(await request.json());
  const { bookingId } = checkoutSchema.parse(raw);

  const result = await createBookingCheckout(sessionUser, bookingId);

  return ok(result, "Checkout session created");
});
