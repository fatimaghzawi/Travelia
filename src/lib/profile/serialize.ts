import type { IUser, VerificationStatus } from "@/models/user.model";

export type ProfilePassportDto = {
  fullName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportImage: string;
};

export type ProfileDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  image: string | null;
  country: string | null;
  bio: string | null;
  provider: string;
  hasPassword: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  passport: ProfilePassportDto | null;
};

export function serializeProfile(user: IUser): ProfileDto {
  const passport = user.passport
    ? {
        fullName: user.passport.fullName,
        nationality: user.passport.nationality,
        passportNumber: user.passport.passportNumber,
        passportExpiry: new Date(user.passport.passportExpiry)
          .toISOString()
          .slice(0, 10),
        passportImage: user.passport.passportImage,
      }
    : null;

  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? null,
    image: user.image ?? null,
    country: user.country ?? null,
    bio: user.bio ?? null,
    provider: String(user.provider),
    hasPassword: Boolean(
      (user as IUser & { password?: string | null }).password
    ),
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    verificationNote: user.verificationNote ?? null,
    passport,
  };
}
