import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { connectDB } from "@/lib/db/mongoose";
import { resetPasswordSchema } from "@/validators/auth.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { resetPasswordWithToken } from "@/lib/auth/tokens";

export const POST = apiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request.headers);
  await checkRateLimit(`reset:${ip}`, "resetPassword");

  const body = sanitizeInput(await request.json());
  const data = resetPasswordSchema.parse(body);

  await connectDB();

  const result = await resetPasswordWithToken(data.token, data.password);
  if (result.status === "invalid_token") {
    throw new AppError(
      AUTH_MESSAGES.invalidResetToken,
      400,
      "INVALID_TOKEN"
    );
  }

  if (result.status === "user_not_found") {
    throw new AppError(
      AUTH_MESSAGES.invalidResetToken,
      400,
      "INVALID_TOKEN"
    );
  }

  return ok(null, AUTH_MESSAGES.resetPasswordSuccess);
});
