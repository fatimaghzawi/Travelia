import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * Static server shell + client form island.
 * Suspense boundary required because LoginForm reads searchParams via useSearchParams.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Sign in · Travelia",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-[#67717A]">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
