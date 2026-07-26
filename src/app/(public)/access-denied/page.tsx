import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Access denied · Travelia",
};

export default function AccessDeniedPage() {
  return (
    <AuthShell
      title="Access denied"
      subtitle="You don't have permission to view this page. If your role was just changed in the database, sign out and sign in again so your session picks up ADMIN."
    >
      <div className="flex flex-col gap-3">
        <SignOutButton className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white" />
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#127E83] px-4 text-sm font-semibold text-[#127E83]"
        >
          Go to dashboard
        </Link>
      </div>
    </AuthShell>
  );
}
