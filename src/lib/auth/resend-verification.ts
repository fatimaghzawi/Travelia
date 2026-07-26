import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import User from "@/models/user.model";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { redactEmail } from "@/lib/auth/utils";
import type { ForgotPasswordInput } from "@/validators/auth.validator";

/**
 * Resend the email verification link when the account exists, is
 * unverified, and is not blocked/inactive. Silently no-ops otherwise —
 * the route returns the same generic message to avoid enumeration.
 */
export async function resendVerificationEmail(
  data: ForgotPasswordInput
): Promise<void> {
  await connectDB();

  const user = await User.findOne({ email: data.email }).select(
    "_id email firstName lastName emailVerified status"
  );

  if (
    !user ||
    user.emailVerified ||
    user.status === "blocked" ||
    user.status === "inactive"
  ) {
    return;
  }

  const token = await createEmailVerificationToken(user._id);

  try {
    await sendVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      token
    );
    logger.info("Verification email resent", { email: redactEmail(user.email) });
  } catch (error) {
    logger.error("Resend verification email failed", { error });
    throw new AppError(
      error instanceof Error ? error.message : "Failed to send verification email.",
      502,
      "EMAIL_SEND_FAILED"
    );
  }
}
