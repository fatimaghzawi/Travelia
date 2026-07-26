import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import { changePasswordSchema } from "@/validators/user.validator";
import { changePassword } from "@/lib/profile/queries";

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireTraveler();
  const raw = sanitizeInput(await request.json());
  const input = changePasswordSchema.parse(raw);

  await changePassword(session.id, input);

  return ok({ changed: true }, "Password updated");
});
