import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Dashboard gate — uses JWT claims (refreshed every 15m / on session update).
 * Avoids a Mongo round-trip on every dashboard navigation.
 */
export default async function TravelerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (session.user.status !== "active") {
    redirect("/login?error=account_inactive");
  }
  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  return children;
}
