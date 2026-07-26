import type { Types } from "mongoose";
import EmailVerificationToken from "@/models/emailVerificationToken.model";
import PasswordResetToken from "@/models/passwordResetToken.model";
import User from "@/models/user.model";
import { logger } from "@/lib/logger";
import { AUTH_PROVIDERS } from "@/lib/constants/roles";
import { redactEmail } from "@/lib/auth/utils";
import { generateSecureToken, hashPassword, hashToken } from "./passwords";

const EMAIL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function createEmailVerificationToken(
  userId: Types.ObjectId | string
): Promise<string> {
  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);

  await EmailVerificationToken.deleteMany({ userId });
  await EmailVerificationToken.create({
    userId,
    hashedToken,
    expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
  });

  return rawToken;
}

export async function consumeEmailVerificationToken(
  rawToken: string
): Promise<Types.ObjectId | null> {
  const result = await verifyEmailWithToken(rawToken);
  if (result.status === "verified" || result.status === "already_verified") {
    return result.userId;
  }
  return null;
}

export type VerifyEmailResult =
  | { status: "verified"; userId: Types.ObjectId; email: string }
  | { status: "already_verified"; userId: Types.ObjectId; email: string }
  | { status: "invalid_token" }
  | { status: "user_not_found" };

function normalizeVerificationToken(rawToken: string): string {
  const trimmed = rawToken.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/**
 * Verify email atomically: update user first, delete token only after success.
 */
export async function verifyEmailWithToken(
  rawToken: string
): Promise<VerifyEmailResult> {
  const token = normalizeVerificationToken(rawToken);
  if (!token) return { status: "invalid_token" };

  const hashedToken = hashToken(token);
  const record = await EmailVerificationToken.findOne({ hashedToken });

  if (!record) return { status: "invalid_token" };
  if (record.expiresAt.getTime() < Date.now()) {
    await EmailVerificationToken.deleteOne({ _id: record._id });
    return { status: "invalid_token" };
  }

  const existingUser = await User.findById(record.userId).select(
    "_id email emailVerified"
  );
  if (!existingUser) {
    await EmailVerificationToken.deleteOne({ _id: record._id });
    return { status: "user_not_found" };
  }

  if (existingUser.emailVerified) {
    await EmailVerificationToken.deleteOne({ _id: record._id });
    return {
      status: "already_verified",
      userId: existingUser._id,
      email: existingUser.email,
    };
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: existingUser._id, emailVerified: false },
    { $set: { emailVerified: true } },
    { returnDocument: "after", runValidators: false }
  ).select("_id email emailVerified");

  if (!updatedUser?.emailVerified) {
    logger.error("Email verification update did not persist", {
      userId: existingUser._id.toString(),
      email: existingUser.email,
    });
    return { status: "invalid_token" };
  }

  await EmailVerificationToken.deleteOne({ _id: record._id });

  logger.info("Email verified", {
    userId: updatedUser._id.toString(),
    email: redactEmail(updatedUser.email),
    emailVerified: updatedUser.emailVerified,
  });

  return {
    status: "verified",
    userId: updatedUser._id,
    email: updatedUser.email,
  };
}

export async function createPasswordResetToken(
  userId: Types.ObjectId | string
): Promise<string> {
  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);

  await PasswordResetToken.deleteMany({ userId });
  await PasswordResetToken.create({
    userId,
    hashedToken,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  return rawToken;
}

export type ResetPasswordResult =
  | { status: "reset"; userId: Types.ObjectId }
  | { status: "invalid_token" }
  | { status: "user_not_found" };

function normalizeResetToken(rawToken: string): string {
  const trimmed = rawToken.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const token = normalizeResetToken(rawToken);
  if (!token) return { status: "invalid_token" };

  const hashedToken = hashToken(token);
  const record = await PasswordResetToken.findOne({ hashedToken });

  if (!record) return { status: "invalid_token" };
  if (record.expiresAt.getTime() < Date.now()) {
    await PasswordResetToken.deleteOne({ _id: record._id });
    return { status: "invalid_token" };
  }

  const user = await User.findById(record.userId).select("_id");
  if (!user) {
    await PasswordResetToken.deleteOne({ _id: record._id });
    return { status: "user_not_found" };
  }

  const hashed = await hashPassword(newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashed,
        provider: AUTH_PROVIDERS.CREDENTIALS,
      },
    }
  );

  await PasswordResetToken.deleteOne({ _id: record._id });

  logger.info("Password reset completed", {
    userId: user._id.toString(),
  });

  return { status: "reset", userId: user._id };
}
