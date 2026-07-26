import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

/** Static shell; interactive multi-step form is a client island. */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Create account · Travelia",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
