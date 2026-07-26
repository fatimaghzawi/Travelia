import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PaymentSuccessClient } from "@/components/traveler/PaymentSuccessClient";

export const metadata: Metadata = {
  title: "Payment successful · Travelia",
};

export default async function BookingPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/bookings/success");
  }

  const { session_id: sessionId } = await searchParams;

  return <PaymentSuccessClient sessionId={sessionId ?? null} />;
}
