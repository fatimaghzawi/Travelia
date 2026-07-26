import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { requireTraveler } from "@/lib/auth/session";
import { confirmCheckoutSessionById } from "@/lib/payments/confirm-checkout";

const schema = z.object({
  sessionId: z.string().trim().min(3),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireTraveler();
  await connectDB();

  // Do not XSS-sanitize Stripe session ids (underscores / long tokens)
  const body = (await request.json()) as { sessionId?: unknown };
  const { sessionId } = schema.parse({
    sessionId:
      typeof body.sessionId === "string" ? body.sessionId.trim() : body.sessionId,
  });

  const result = await confirmCheckoutSessionById(sessionId, {
    expectedUserId: sessionUser.id,
  });

  if (result.reason === "forbidden") {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  if (result.reason === "payment_not_found") {
    throw new AppError("Payment not found", 404, "NOT_FOUND");
  }
  if (!result.confirmed) {
    return ok(
      {
        confirmed: false,
        reason: result.reason,
        paymentStatus:
          "paymentStatus" in result ? result.paymentStatus : undefined,
      },
      "Payment not completed yet"
    );
  }

  return ok(
    {
      confirmed: true,
      bookingIds: result.bookingIds,
      amount: result.amount,
      paymentId: result.paymentId,
    },
    "Payment confirmed"
  );
});
