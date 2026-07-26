import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { buildAuthProviders, nodeAuthCallbacks } from "@/lib/auth/providers";

/**
 * Auth.js v5 entry — JWT sessions, no database adapter.
 * Import { auth, signIn, signOut, handlers } from "@/auth"
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: buildAuthProviders(),
  secret: process.env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    signIn: nodeAuthCallbacks.signIn as never,
    jwt: nodeAuthCallbacks.jwt as never,
    session: nodeAuthCallbacks.session as never,
  },
});
