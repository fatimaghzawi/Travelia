"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from "@/validators/auth.validator";
import { Alert, Button, PasswordInput } from "@/components/ui";
import { CenteredAuthLayout } from "@/components/auth/AuthShell";
import { AuthFormHeader } from "@/components/auth/AuthFormHeader";
import { AuthBackLink } from "@/components/auth/AuthBackLink";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordFormInput) {
    setServerError(null);
    setSuccess(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, token }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      setServerError(json.message ?? "Unable to reset password.");
      return;
    }

    setSuccess(json.message);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <CenteredAuthLayout>
      <AuthFormHeader
        title="Reset password"
        subtitle="Choose a new password for your account."
        logoSize="lg"
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          leftIcon={<Lock size={18} />}
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Confirm your new password"
          leftIcon={<Lock size={18} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError ? <Alert>{serverError}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>

      <AuthBackLink />
    </CenteredAuthLayout>
  );
}
