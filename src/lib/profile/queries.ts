import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { User } from "@/models";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { AUTH_PROVIDERS } from "@/lib/constants/roles";
import type {
  ChangePasswordInput,
  PassportInput,
  UpdateProfileInput,
} from "@/validators/user.validator";

async function findUserOrThrow(userId: string) {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
}

export async function getProfile(userId: string) {
  await connectDB();
  return findUserOrThrow(userId);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await connectDB();
  const user = await findUserOrThrow(userId);

  let emailChanged = false;
  if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
    const emailTaken = await User.findOne({
      email: input.email.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (emailTaken) {
      throw new AppError("Email already in use", 409, "EMAIL_TAKEN");
    }
    user.email = input.email.toLowerCase();
    user.emailVerified = false;
    emailChanged = true;
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone ?? undefined;
  if (input.image !== undefined) user.image = input.image;
  if (input.country !== undefined) user.country = input.country ?? undefined;
  if (input.bio !== undefined) user.bio = input.bio ?? undefined;

  await user.save();

  return { user, emailChanged };
}

export async function updatePassport(userId: string, passport: PassportInput) {
  await connectDB();
  const user = await findUserOrThrow(userId);

  user.passport = {
    fullName: passport.fullName,
    nationality: passport.nationality,
    passportNumber: passport.passportNumber.toUpperCase(),
    passportExpiry: passport.passportExpiry,
    passportImage: passport.passportImage,
  };

  await user.save();
  return user;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
) {
  await connectDB();
  const user = await findUserOrThrow(userId);

  if (user.provider !== AUTH_PROVIDERS.CREDENTIALS || !user.password) {
    throw new AppError(
      "Password change is only available for email/password accounts",
      400,
      "NO_PASSWORD"
    );
  }

  const valid = await verifyPassword(input.currentPassword, user.password);
  if (!valid) {
    throw new AppError("Current password is incorrect", 400, "INVALID_PASSWORD");
  }

  user.password = await hashPassword(input.newPassword);
  await user.save();
}

export async function setAvatar(userId: string, url: string) {
  await connectDB();
  const user = await findUserOrThrow(userId);
  user.image = url;
  await user.save();
  return user;
}
