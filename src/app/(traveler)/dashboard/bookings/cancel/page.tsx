import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PayNowButton } from "@/components/traveler/PayNowButton";

export const metadata: Metadata = {
  title: "Payment cancelled · Travelia",
};

export default async function BookingPaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/bookings/cancel");
  }

  const { bookingId } = await searchParams;

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
        Payment cancelled
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#67717A] sm:text-base">
        No charge was made. Your booking is still pending — you can pay now or
        try again later from your bookings list.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        {bookingId ? <PayNowButton bookingId={bookingId} /> : null}
        <Link
          href="/dashboard/bookings"
          className="text-sm font-medium text-[#127E83] hover:underline"
        >
          Back to bookings
        </Link>
      </div>
    </div>
  );
}
