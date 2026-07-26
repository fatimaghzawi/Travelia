import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants/roles";
import { Sidebar } from "@/components/admin/Sidebar";
import { ToastProvider } from "@/components/admin/Toast";
import { assertUserStillActive } from "@/lib/auth/session";

/**
 * Admin shell — JWT gate first, then a single DB assert for role/block state.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  // Fast path from JWT; still verify DB for privileged admin surface
  if (session.user.role === ROLES.ADMIN && session.user.status === "active") {
    try {
      const dbUser = await assertUserStillActive(session.user.id);
      if (dbUser.role !== ROLES.ADMIN) {
        redirect("/access-denied");
      }
    } catch {
      redirect("/login?error=account_inactive");
    }
  } else if (session.user.role !== ROLES.ADMIN) {
    redirect("/access-denied");
  } else {
    redirect("/login?error=account_inactive");
  }

  return (
    <ToastProvider>
      <div className="admin-shell relative min-h-screen">
        <div className="admin-shell__glow" aria-hidden />
        <Sidebar />
        <div className="relative z-10 pl-0 lg:pl-64">{children}</div>
      </div>
    </ToastProvider>
  );
}
