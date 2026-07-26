import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserStatus } from "@/models/user.model";

function isAppUser(
  user: User
): user is User & {
  role: NonNullable<User["role"]>;
  provider: NonNullable<User["provider"]>;
  status: UserStatus;
} {
  return (
    typeof user.role === "string" &&
    typeof user.provider === "string" &&
    typeof user.status === "string"
  );
}

function isActiveSession(token: JWT): boolean {
  return token.status === "active" && !!token.role;
}

/**
 * Edge-safe JWT/session callbacks for middleware.
 * Must stay free of Mongoose / Node-only imports.
 */
export const edgeAuthCallbacks = {
  jwt({
    token,
    user,
  }: {
    token: JWT;
    user?: User;
  }) {
    if (user && isAppUser(user)) {
      token.id = user.id!;
      token.role = user.role;
      token.provider = user.provider;
      token.emailVerified = user.emailVerified ?? false;
      token.status = user.status;
      token.name = user.name;
      token.email = user.email;
      token.picture = user.image;
    }
    return token;
  },

  session({ session, token }: { session: Session; token: JWT }) {
    if (session.user) {
      if (!isActiveSession(token)) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.provider = token.provider;
      session.user.emailVerified = token.emailVerified ?? false;
      session.user.status = token.status;
      session.user.name = token.name ?? session.user.name;
      session.user.email = token.email ?? session.user.email;
      session.user.image = (token.picture as string | null) ?? null;
    }
    return session;
  },
};
