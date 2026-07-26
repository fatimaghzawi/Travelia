"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { loginSchema, type LoginInput } from "@/validators/auth.validator";
import { Alert, Button, Divider, Input, PasswordInput } from "@/components/ui";
import { CenteredAuthLayout } from "@/components/auth/AuthShell";
import { AuthFormHeader } from "@/components/auth/AuthFormHeader";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const authError = searchParams.get("error");
  const authErrorMessage =
    authError === "CredentialsSignin"
      ? "Invalid email or password."
      : authError
        ? "Sign in failed. Please try again."
        : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const displayError = serverError ?? authErrorMessage;

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setResendMessage(null);
    setUnverifiedEmail(null);
    const result = await signIn("credentials", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      const code = result.code ?? result.error;
      if (code === "email_not_verified" || code === "EmailNotVerified") {
        setUnverifiedEmail(values.email);
        setServerError(
          "Please verify your email before signing in. Check your inbox for the verification link."
        );
      } else if (code === "account_inactive" || code === "AccountInactive") {
        setServerError("Your account is not active. Contact support.");
      } else if (code === "rate_limited" || code === "RateLimited") {
        setServerError("Too many login attempts. Please wait and try again.");
      } else if (code === "invalid_credentials" || code === "CredentialsSignin") {
        setServerError("Invalid email or password.");
      } else {
        setServerError("Invalid email or password.");
      }
      return;
    }

    // Prefer explicit callback when provided; otherwise route by role.
    let destination = callbackUrl;
    if (!searchParams.get("callbackUrl")) {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = (await sessionRes.json()) as {
          user?: { role?: string };
        };
        destination =
          session.user?.role === "ADMIN" ? "/admin" : "/dashboard";
      } catch {
        destination = "/dashboard";
      }
    }

    router.push(destination);
    router.refresh();
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const json = (await res.json()) as { message?: string };

      if (!res.ok) {
        setResendMessage(json.message ?? "Could not resend verification email.");
        return;
      }

      setResendMessage(
        json.message ??
          "If your account is unverified, a new verification link has been sent."
      );
    } catch {
      setResendMessage("Could not resend verification email. Try again later.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <CenteredAuthLayout>
      <AuthFormHeader
        title="Welcome back"
        subtitle="Sign in to continue your journey."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 flex flex-col gap-3.5"
        noValidate
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          leftIcon={<Mail size={18} strokeWidth={1.75} />}
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          leftIcon={<Lock size={18} strokeWidth={1.75} />}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[#0f172a]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#cbd5e1] text-[#127E83] accent-[#127E83] focus:ring-[#127E83]"
              {...register("remember")}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-[#3b82f6] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {displayError ? <Alert>{displayError}</Alert> : null}

        {unverifiedEmail ? (
          <div className="flex flex-col gap-2 text-sm">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="font-medium text-[#127E83] hover:underline disabled:opacity-60"
            >
              {isResending ? "Sending…" : "Resend verification email"}
            </button>
            {resendMessage ? (
              <p className="text-[#64748b]">{resendMessage}</p>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Divider className="my-4" />

      <p className="text-center text-sm text-[#64748b]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#127E83] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </CenteredAuthLayout>
  );
}
