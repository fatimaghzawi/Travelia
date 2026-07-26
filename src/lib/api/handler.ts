import type { NextRequest } from "next/server";
import { fail } from "./response";
import { toAppError } from "./errors";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

type ApiHandlerFn = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<Response>;

type ApiHandlerOptions = {
  /** Apply the general API rate limiter (default true). */
  rateLimit?: boolean;
};

/**
 * Shared API wrapper — rate limit + normalized errors.
 */
export function apiHandler(
  handler: ApiHandlerFn,
  options: ApiHandlerOptions = {}
) {
  const { rateLimit = true } = options;

  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      if (rateLimit) {
        const ip = getClientIp(request.headers);
        await checkRateLimit(`api:${ip}:${request.nextUrl.pathname}`, "api");
      }
      return await handler(request, context);
    } catch (error) {
      const appError = toAppError(error);
      return fail(
        appError.message,
        appError.statusCode,
        appError.code,
        appError.errors
      );
    }
  };
}

export { AppError } from "./errors";
