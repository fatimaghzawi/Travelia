import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { createPasswordResetToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { redactEmail } from "@/lib/auth/utils";
import type { ForgotPasswordInput } from "@/validators/auth.validator";

/**
 * Send a password reset email when the account exists and is eligible.
 * Always resolves (never throws) — the route returns the same generic
 * message either way to avoid account enumeration.
 */
export async function requestPasswordReset(data: ForgotPasswordInput): Promise<void> {
  await connectDB();

  const user = await User.findOne({ email: data.email });
  if (!user) return;
  if (user.status === "blocked" || user.status === "inactive") return;

  const token = await createPasswordResetToken(user._id);

  try {
    await sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      token
    );
    logger.info("Password reset email sent", { email: redactEmail(user.email) });
  } catch (error) {
    logger.error("Password reset email failed", { error });
  }
}
