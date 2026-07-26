import type { ReactNode } from "react";
import { TravelerShell } from "@/components/traveler/TravelerShell";
import { auth } from "@/auth";

/**
 * Traveler shell — session comes from root SessionProvider;
 * we only pass display fields into the chrome.
 */
export default async function TravelerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <TravelerShell
      user={
        session?.user
          ? {
              name: session.user.name ?? null,
              email: session.user.email ?? null,
              image: session.user.image ?? null,
            }
          : null
      }
    >
      {children}
    </TravelerShell>
  );
}
