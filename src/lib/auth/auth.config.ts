import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/constants/roles";
import { edgeAuthCallbacks } from "@/lib/auth/edge-callbacks";
import {
  isAdminRoute,
  isAuthRoute,
  isPublicRoute,
  isTravelerRoute,
} from "@/lib/constants/routes";

function hasActiveSession(auth: { user?: { role?: string; status?: string; emailVerified?: boolean } } | null): boolean {
  return (
    !!auth?.user &&
    auth.user.status === "active" &&
    !!auth.user.role &&
    auth.user.emailVerified === true
  );
}

/**
 * Edge-compatible Auth.js config (used by middleware).
 * Do NOT import Mongoose, bcrypt, or Node-only modules here.
 */
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
  callbacks: {
    jwt: edgeAuthCallbacks.jwt as never,
    session: edgeAuthCallbacks.session as never,
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = hasActiveSession(auth);

      if (isPublicRoute(pathname) && !isAuthRoute(pathname)) {
        return true;
      }

      if (isAuthRoute(pathname)) {
        if (isLoggedIn && auth?.user?.role) {
          const role = auth.user.role;
          if (role === ROLES.ADMIN || role === ROLES.TRAVELER) {
            const dest = role === ROLES.ADMIN ? "/admin" : "/dashboard";
            return Response.redirect(new URL(dest, request.nextUrl));
          }
        }
        return true;
      }

      if (isAdminRoute(pathname)) {
        if (!isLoggedIn) {
          const login = new URL("/login", request.nextUrl);
          login.searchParams.set("callbackUrl", pathname);
          return Response.redirect(login);
        }
        if (auth?.user?.role !== ROLES.ADMIN) {
          return Response.redirect(new URL("/access-denied", request.nextUrl));
        }
        return true;
      }

      if (isTravelerRoute(pathname)) {
        if (!isLoggedIn) {
          const login = new URL("/login", request.nextUrl);
          login.searchParams.set("callbackUrl", pathname);
          return Response.redirect(login);
        }
        if (
          auth?.user?.role !== ROLES.TRAVELER &&
          auth?.user?.role !== ROLES.ADMIN
        ) {
          return Response.redirect(new URL("/access-denied", request.nextUrl));
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
