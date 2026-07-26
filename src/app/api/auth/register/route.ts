import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { registerSchema } from "@/validators/auth.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { registerUser } from "@/lib/auth/register";

const REGISTER_SUCCESS_MESSAGE = AUTH_MESSAGES.registerSuccess;

export const POST = apiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request.headers);
  await checkRateLimit(`register:${ip}`, "register");

  const body = sanitizeInput(await request.json());
  const data = registerSchema.parse(body);

  const { email } = await registerUser(data);

  return ok({ email }, REGISTER_SUCCESS_MESSAGE);
});
