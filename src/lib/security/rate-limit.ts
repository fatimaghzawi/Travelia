import { RateLimiterMemory } from "rate-limiter-flexible";
import { AppError } from "@/lib/api/errors";

type LimiterName =
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "resendVerification"
  | "api";

const limiters: Record<LimiterName, RateLimiterMemory> = {
  login: new RateLimiterMemory({
    points: 10,
    duration: 60 * 15,
    blockDuration: 60 * 15,
  }),
  register: new RateLimiterMemory({
    points: 5,
    duration: 60 * 60,
    blockDuration: 60 * 30,
  }),
  forgotPassword: new RateLimiterMemory({
    points: 3,
    duration: 60 * 60,
    blockDuration: 60 * 60,
  }),
  resetPassword: new RateLimiterMemory({
    points: 5,
    duration: 60 * 60,
    blockDuration: 60 * 30,
  }),
  resendVerification: new RateLimiterMemory({
    points: 3,
    duration: 60 * 60,
    blockDuration: 60 * 60,
  }),
  api: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),
};

/**
 * Consume one point for the given key. Throws AppError 429 when exceeded.
 */
export async function checkRateLimit(
  key: string,
  limiter: LimiterName = "api"
): Promise<void> {
  try {
    await limiters[limiter].consume(key);
  } catch {
    throw new AppError(
      "Too many requests. Please try again later.",
      429,
      "RATE_LIMITED"
    );
  }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}
