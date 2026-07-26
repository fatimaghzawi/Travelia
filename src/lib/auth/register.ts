import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import User from "@/models/user.model";
import { hashPassword } from "@/lib/auth/passwords";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { AUTH_PROVIDERS, ROLES } from "@/lib/constants/roles";
import { logger } from "@/lib/logger";
import { redactEmail } from "@/lib/auth/utils";
import type { RegisterInput } from "@/validators/auth.validator";

async function deliverVerificationEmail(user: {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const token = await createEmailVerificationToken(user._id);
  await sendVerificationEmail(
    user.email,
    `${user.firstName} ${user.lastName}`.trim(),
    token
  );
}

/**
 * Register a new traveler account, or resend verification for an existing
 * unverified account. Always returns the account's email — the route
 * returns the same generic success message either way to avoid enumeration.
 */
export async function registerUser(data: RegisterInput): Promise<{ email: string }> {
  await connectDB();

  const existing = await User.findOne({ email: data.email }).select(
    "_id email firstName lastName emailVerified status"
  );
  if (existing) {
    // Do not overwrite password/name on an unverified account (takeover risk).
    // Resend verification only when the account is still eligible.
    if (
      !existing.emailVerified &&
      existing.status !== "blocked" &&
      existing.status !== "inactive"
    ) {
      try {
        await deliverVerificationEmail(existing);
        logger.info("Verification email resent for unverified account", {
          email: redactEmail(existing.email),
        });
      } catch (error) {
        logger.error("Verification email failed for existing account", { error });
        throw new AppError(
          error instanceof Error
            ? error.message
            : "Failed to send verification email.",
          502,
          "EMAIL_SEND_FAILED"
        );
      }
    }

    return { email: data.email };
  }

  const hashed = await hashPassword(data.password);
  const phone = data.phone?.trim() ? data.phone.trim() : undefined;
  const country = data.country?.trim() ? data.country.trim() : undefined;
  const bio = data.bio?.trim() ? data.bio.trim() : undefined;

  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: hashed,
    phone,
    country,
    bio,
    role: ROLES.TRAVELER,
    emailVerified: false,
    provider: AUTH_PROVIDERS.CREDENTIALS,
    image: null,
    status: "active",
  });

  try {
    await deliverVerificationEmail(user);
  } catch (error) {
    logger.error("Verification email failed after registration", { error });
    throw new AppError(
      error instanceof Error
        ? error.message
        : "Failed to send verification email.",
      502,
      "EMAIL_SEND_FAILED"
    );
  }

  return { email: user.email };
}
