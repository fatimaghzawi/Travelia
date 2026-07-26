import { cache } from "react";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import User, { type IUser, type UserStatus } from "@/models/user.model";
import { AppError } from "@/lib/api/errors";
import { ROLES, type Role } from "@/lib/constants/roles";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
  provider: string;
  emailVerified: boolean;
  status: UserStatus;
};

/**
 * Auth.js session → SessionUser. Cached per React request tree.
 * Trusts JWT claims (refreshed every 15m / on session update) so layouts
 * don't hit Mongo on every navigation.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.status !== "active" || !session.user.emailVerified) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image ?? null,
    role: session.user.role,
    provider: session.user.provider,
    emailVerified: session.user.emailVerified,
    status: session.user.status,
  };
});

/**
 * Loads the full MongoDB user document for the current session.
 * Use only when profile/passport fields are required.
 */
export const getCurrentUserDocument = cache(async (): Promise<IUser | null> => {
  const current = await getCurrentUser();
  if (!current) return null;

  await connectDB();
  return User.findById(current.id);
});

/**
 * Fresh DB check for sensitive mutations (role changes, blocks).
 */
export async function assertUserStillActive(
  userId: string
): Promise<SessionUser> {
  await connectDB();
  const dbUser = await User.findById(userId)
    .select("status emailVerified role provider email firstName lastName image")
    .lean();

  if (!dbUser || dbUser.status !== "active" || !dbUser.emailVerified) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  return {
    id: String(dbUser._id),
    email: dbUser.email ?? "",
    name: `${dbUser.firstName ?? ""} ${dbUser.lastName ?? ""}`.trim(),
    image: dbUser.image ?? null,
    role: dbUser.role,
    provider: dbUser.provider,
    emailVerified: dbUser.emailVerified,
    status: dbUser.status,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (user.status !== "active") {
    throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
  }
  return user;
}

export async function requireVerifiedEmail(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.emailVerified) {
    throw new AppError("Email verification required", 403, "EMAIL_NOT_VERIFIED");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireVerifiedEmail();
  if (user.role !== ROLES.ADMIN) {
    throw new AppError("Admin access required", 403, "FORBIDDEN");
  }
  return user;
}

export async function requireTraveler(): Promise<SessionUser> {
  const user = await requireVerifiedEmail();
  if (user.role !== ROLES.TRAVELER && user.role !== ROLES.ADMIN) {
    throw new AppError("Traveler access required", 403, "FORBIDDEN");
  }
  return user;
}
