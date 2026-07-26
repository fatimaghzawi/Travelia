"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/validators/auth.validator";
import { Alert, Button, Input } from "@/components/ui";
import { SplitAuthLayout } from "@/components/auth/AuthShell";
import { AuthFormHeader } from "@/components/auth/AuthFormHeader";
import { AuthBackLink } from "@/components/auth/AuthBackLink";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    setMessage(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      setServerError(json.message ?? "Something went wrong.");
      return;
    }

    setMessage(
      "Check your inbox. If an account exists for this email, you will receive a password reset link shortly."
    );
  }

  return (
    <SplitAuthLayout>
      <AuthFormHeader
        title="Forgot password?"
        subtitle="Enter your email address and we'll send you a link to reset your password."
        logoSize="lg"
        align="center"
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          leftIcon={<Mail size={18} />}
          error={errors.email?.message}
          {...register("email")}
        />

        {serverError ? <Alert>{serverError}</Alert> : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <AuthBackLink />

      {message ? (
        <Alert variant="info" withIcon className="mt-5">
          {message}
        </Alert>
      ) : null}
    </SplitAuthLayout>
  );
}
