import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { CredentialsSignin } from "next-auth";
import type { User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/models/user.model";
import { verifyPassword } from "@/lib/auth/passwords";
import { credentialsLoginSchema } from "@/validators/auth.validator";
import { AUTH_PROVIDERS, ROLES, type Role } from "@/lib/constants/roles";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { redactEmail } from "@/lib/auth/utils";
import { logger } from "@/lib/logger";
import type { UserStatus } from "@/models/user.model";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

type AppUser = User & {
  role: Role;
  provider: string;
  emailVerified: boolean;
  status: UserStatus;
};

/**
 * Provider registry — add GitHub / Apple here later without changing callbacks.
 */
export function buildAuthProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [
    Credentials({
      id: AUTH_PROVIDERS.CREDENTIALS,
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsLoginSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn("Login rejected: invalid credentials payload");
          throw new InvalidCredentialsError();
        }

        try {
          await checkRateLimit(`login:${parsed.data.email}`, "login");
        } catch {
          logger.warn("Login rejected: rate limited", {
            email: redactEmail(parsed.data.email),
          });
          throw new RateLimitedError();
        }

        await connectDB();

        const user = await UserModel.findOne({
          email: parsed.data.email,
        }).select(
          "+password emailVerified status firstName lastName role provider image"
        );

        if (!user || !user.password) {
          logger.warn("Login rejected: user not found or no password", {
            email: redactEmail(parsed.data.email),
          });
          throw new InvalidCredentialsError();
        }

        if (user.status === "blocked" || user.status === "inactive") {
          logger.warn("Login rejected: account inactive", {
            email: redactEmail(parsed.data.email),
            status: user.status,
          });
          throw new AccountInactiveError();
        }

        if (!user.emailVerified) {
          logger.warn("Login rejected: email not verified", {
            email: redactEmail(parsed.data.email),
            userId: user._id.toString(),
          });
          throw new EmailNotVerifiedError();
        }

        const valid = await verifyPassword(
          parsed.data.password,
          user.password
        );
        if (!valid) {
          logger.warn("Login rejected: wrong password", {
            email: redactEmail(parsed.data.email),
            userId: user._id.toString(),
          });
          throw new InvalidCredentialsError();
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          image: user.image ?? null,
          role: user.role,
          provider: user.provider,
          emailVerified: user.emailVerified,
          status: user.status,
        } satisfies AppUser;
      },
    }),
  ];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: false,
      })
    );
  }

  // Future: GitHub({ ... }), Apple({ ... })

  return providers;
}

export const nodeAuthCallbacks = {
  async signIn({
    user,
    account,
  }: {
    user: AppUser;
    account: { provider: string } | null;
  }) {
    if (!account) return false;

    if (account.provider === AUTH_PROVIDERS.CREDENTIALS) {
      return true;
    }

    if (!user.email) return false;

    await connectDB();

    let dbUser = await UserModel.findOne({ email: user.email.toLowerCase() });

    if (!dbUser) {
      const displayName = user.name?.trim() || "Traveler";
      const parts = displayName.split(/\s+/);
      const firstName = parts[0] || "Traveler";
      const lastName = parts.slice(1).join(" ") || firstName;

      dbUser = await UserModel.create({
        firstName,
        lastName,
        email: user.email.toLowerCase(),
        image: user.image ?? null,
        role: ROLES.TRAVELER,
        emailVerified: true,
        provider: account.provider,
        status: "active",
      });
    } else {
      if (dbUser.status === "blocked" || dbUser.status === "inactive") {
        return false;
      }

      // Never claim an unverified password account through Google
      if (
        dbUser.provider === AUTH_PROVIDERS.CREDENTIALS &&
        !dbUser.emailVerified
      ) {
        return false;
      }

      let dirty = false;
      if (
        !dbUser.emailVerified &&
        dbUser.provider !== AUTH_PROVIDERS.CREDENTIALS
      ) {
        dbUser.emailVerified = true;
        dirty = true;
      }
      if (user.image && dbUser.image !== user.image) {
        dbUser.image = user.image;
        dirty = true;
      }
      if (
        dbUser.provider !== AUTH_PROVIDERS.CREDENTIALS &&
        dbUser.provider !== account.provider
      ) {
        dbUser.provider = account.provider;
        dirty = true;
      }
      if (dirty) await dbUser.save();
    }

    user.id = dbUser._id.toString();
    user.role = dbUser.role;
    user.provider = dbUser.provider;
    user.emailVerified = dbUser.emailVerified;
    user.status = dbUser.status;

    return true;
  },

  async jwt({
    token,
    user,
    trigger,
  }: {
    token: JWT;
    user?: AppUser;
    trigger?: "signIn" | "signUp" | "update";
  }) {
    if (user) {
      token.id = user.id!;
      token.role = user.role;
      token.provider = user.provider;
      token.emailVerified = user.emailVerified;
      token.status = user.status;
      token.name = user.name;
      token.email = user.email;
      token.picture = user.image;
      token.lastSyncedAt = Date.now();
      return token;
    }

    // Re-read role/status periodically so admin promotions take effect.
    // Keep this in minutes — sub-minute syncs create a DB storm under load.
    const JWT_DB_SYNC_MS = 15 * 60 * 1000;
    const lastSyncedAt =
      typeof token.lastSyncedAt === "number" ? token.lastSyncedAt : 0;
    const shouldSync =
      Boolean(token.id) &&
      (trigger === "update" || Date.now() - lastSyncedAt > JWT_DB_SYNC_MS);

    if (shouldSync && token.id) {
      try {
        await connectDB();
        const dbUser = await UserModel.findById(token.id).select(
          "role emailVerified provider status image firstName lastName email"
        );
        if (!dbUser || dbUser.status !== "active") {
          token.status = dbUser?.status ?? "blocked";
          token.role = undefined as never;
          token.emailVerified = false;
          token.lastSyncedAt = Date.now();
          return token;
        }
        token.role = dbUser.role;
        token.emailVerified = dbUser.emailVerified;
        token.provider = dbUser.provider;
        token.status = dbUser.status;
        token.name = `${dbUser.firstName} ${dbUser.lastName}`.trim();
        token.email = dbUser.email;
        token.picture = dbUser.image;
        token.lastSyncedAt = Date.now();
      } catch {
        // Keep existing claims
      }
    }

    return token;
  },

  async session({
    session,
    token,
  }: {
    session: Session;
    token: JWT;
  }) {
    if (session.user) {
      if (token.status !== "active" || !token.role || !token.emailVerified) {
        return {
          ...session,
          user: undefined,
          expires: new Date(0).toISOString(),
        };
      }

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.provider = token.provider;
      session.user.emailVerified = token.emailVerified;
      session.user.status = token.status;
      session.user.name = token.name ?? session.user.name;
      session.user.email = token.email ?? session.user.email;
      session.user.image = (token.picture as string | null) ?? null;
    }
    return session;
  },
};
