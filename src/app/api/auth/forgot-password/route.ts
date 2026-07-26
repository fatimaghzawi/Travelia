import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { forgotPasswordSchema } from "@/validators/auth.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { requestPasswordReset } from "@/lib/auth/forgot-password";

const GENERIC_MESSAGE = AUTH_MESSAGES.forgotPasswordSuccess;

export const POST = apiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request.headers);
  await checkRateLimit(`forgot:${ip}`, "forgotPassword");

  const body = sanitizeInput(await request.json());
  const data = forgotPasswordSchema.parse(body);

  await requestPasswordReset(data);

  return ok(null, GENERIC_MESSAGE);
});
