import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

/** Static shell; form submit runs against the API from the client. */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Forgot password · Travelia",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
