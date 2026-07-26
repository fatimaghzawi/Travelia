"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

type AuthSessionProviderProps = {
  children: ReactNode;
  session?: Session | null;
};

/** Match JWT DB sync cadence — avoid focus-refetch DB storms. */
const SESSION_REFETCH_INTERVAL_SEC = 15 * 60;

export function AuthSessionProvider({
  children,
  session = null,
}: AuthSessionProviderProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={SESSION_REFETCH_INTERVAL_SEC}
    >
      {children}
    </SessionProvider>
  );
}
