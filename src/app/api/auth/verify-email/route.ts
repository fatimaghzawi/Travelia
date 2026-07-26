import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { connectDB } from "@/lib/db/mongoose";
import { verifyEmailSchema } from "@/validators/auth.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { verifyEmailWithToken } from "@/lib/auth/tokens";

export const POST = apiHandler(async (request: NextRequest) => {
  const body = sanitizeInput(await request.json());
  const data = verifyEmailSchema.parse(body);

  await connectDB();

  const result = await verifyEmailWithToken(data.token);
  if (result.status === "invalid_token") {
    throw new AppError(
      AUTH_MESSAGES.invalidVerifyToken,
      400,
      "INVALID_TOKEN"
    );
  }

  if (result.status === "user_not_found") {
    throw new AppError(
      AUTH_MESSAGES.invalidVerifyToken,
      400,
      "INVALID_TOKEN"
    );
  }

  if (result.status === "already_verified") {
    return ok(null, AUTH_MESSAGES.verifyEmailAlready);
  }

  return ok(null, AUTH_MESSAGES.verifyEmailSuccess);
});
