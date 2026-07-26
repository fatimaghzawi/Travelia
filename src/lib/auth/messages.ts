/** Generic responses that avoid account enumeration. */
export const AUTH_MESSAGES = {
  registerSuccess:
    "Account created. Please check your email to verify your account.",
  forgotPasswordSuccess:
    "If an account exists for this email, you will receive a password reset link shortly.",
  resendVerificationSuccess:
    "If your account is unverified, a new verification link has been sent.",
  resetPasswordSuccess:
    "Password updated successfully. You can sign in now.",
  verifyEmailSuccess: "Email verified successfully.",
  verifyEmailAlready: "Email already verified. You can sign in.",
  invalidResetToken:
    "Invalid or expired reset link. Please request a new one.",
  invalidVerifyToken:
    "Invalid or expired verification link.",
} as const;
