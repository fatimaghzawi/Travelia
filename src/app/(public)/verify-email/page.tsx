import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { verifyEmailWithToken } from "@/lib/auth/tokens";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * Dynamic SSR — consumes a one-time token from searchParams and hits MongoDB.
 * Must not be statically cached.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell
        title="Invalid verification link"
        subtitle="The verification token is missing."
      >
        <Link
          href="/login"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white"
        >
          Back to Sign in
        </Link>
      </AuthShell>
    );
  }

  await connectDB();
  const result = await verifyEmailWithToken(token);

  if (result.status === "verified" || result.status === "already_verified") {
    redirect("/email-verified");
  }

  if (result.status === "user_not_found") {
    return (
      <AuthShell title="Account not found" subtitle="We could not find your account.">
        <Link
          href="/register"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white"
        >
          Create account
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Link expired"
      subtitle="This verification link is invalid or has expired. Request a new one from the login page."
    >
      <Link
        href="/login"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#127E83] px-4 text-sm font-semibold text-white"
      >
        Back to Sign in
      </Link>
    </AuthShell>
  );
}
