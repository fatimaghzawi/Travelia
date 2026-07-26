import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { forgotPasswordSchema } from "@/validators/auth.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { resendVerificationEmail } from "@/lib/auth/resend-verification";

const GENERIC_MESSAGE = AUTH_MESSAGES.resendVerificationSuccess;

export const POST = apiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request.headers);
  await checkRateLimit(`resend-verification:${ip}`, "resendVerification");

  const body = sanitizeInput(await request.json());
  const data = forgotPasswordSchema.parse(body);

  await resendVerificationEmail(data);

  return ok(null, GENERIC_MESSAGE);
});
