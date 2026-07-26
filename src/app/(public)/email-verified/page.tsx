import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Email verified · Travelia",
};

export default function EmailVerifiedPage() {
  return (
    <AuthShell
      title="Email verified"
      subtitle="Your email is confirmed. You can now sign in to Travelia."
    >
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-sm text-[#127E83]">
        You&apos;re all set — welcome aboard. Use the same password you chose when
        you registered.
      </div>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white"
      >
        Sign in
      </Link>
    </AuthShell>
  );
}
