import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AuthShell } from "@/components/auth/AuthShell";

/** Dynamic — token comes from searchParams; form is a client island. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset password · Travelia",
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="This password reset link is missing or invalid."
      >
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return <ResetPasswordForm token={token} />;
}
