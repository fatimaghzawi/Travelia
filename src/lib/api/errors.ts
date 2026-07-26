import mongoose from "mongoose";
import { ZodError } from "zod";
import { formatZodError } from "@/validators/common";

export class AppError extends Error {
  statusCode: number;
  code: string;
  errors?: unknown[];

  constructor(
    message: string,
    statusCode = 400,
    code = "APP_ERROR",
    errors?: unknown[]
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Map unknown errors to safe AppError responses.
 * Never leak internal details in production.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      formatZodError(error)
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((e) => e.message);
    return new AppError("Validation failed", 400, "VALIDATION_ERROR", errors);
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid value for field "${error.path}"`, 400, "INVALID_ID");
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    return new AppError("Resource already exists", 409, "DUPLICATE");
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return new AppError(error.message, 500, "INTERNAL_ERROR");
  }

  return new AppError(
    "Something went wrong. Please try again.",
    500,
    "INTERNAL_ERROR"
  );
}
