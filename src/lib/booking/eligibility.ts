/**
 * Booking eligibility helpers.
 * Admin verifies the user once via passport (+ image); bookings do not need admin approval.
 * `verificationStatus === "verified"` is the source of truth; `isVerified` is kept in sync.
 */

export type VerifiablePassport = {
  passportImage?: string | null;
};

export type VerifiableUser = {
  isVerified?: boolean;
  verificationStatus: string;
  passport?: VerifiablePassport | null;
  status: string;
};

export function isPassportVerified(user: VerifiableUser): boolean {
  return user.verificationStatus === "verified" || user.isVerified === true;
}

export function assertUserCanBook(user: VerifiableUser): void {
  if (user.status === "blocked" || user.status === "inactive") {
    throw new Error("Your account cannot make bookings");
  }
  if (!isPassportVerified(user)) {
    throw new Error(
      "Your passport must be verified by an admin before you can book"
    );
  }
  if (!user.passport) {
    throw new Error("Add passport details in your profile before booking");
  }
  if (!user.passport.passportImage) {
    throw new Error("Upload a passport image before booking");
  }
}

export function assertCanUsePassportDetails(
  user: VerifiableUser,
  usePassportDetails: boolean
): void {
  if (!usePassportDetails) return;
  assertUserCanBook(user);
}
