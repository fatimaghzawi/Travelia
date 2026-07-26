import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updatePaymentSchema } from "@/validators/payment.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentForAdmin, updatePaymentAsAdmin } from "@/lib/payments/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const payment = await getPaymentForAdmin(objectIdSchema.parse(id));
  return ok(payment, "Payment");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updatePaymentSchema.parse(raw);

  const payment = await updatePaymentAsAdmin(objectIdSchema.parse(id), input);

  return ok(payment, "Payment updated");
});
