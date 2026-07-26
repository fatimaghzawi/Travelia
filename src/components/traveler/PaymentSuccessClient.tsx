"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PaymentSuccessClientProps = {
  sessionId: string | null;
};

export function PaymentSuccessClient({ sessionId }: PaymentSuccessClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState(
    sessionId
      ? "Confirming your payment…"
      : "Payment received. You can view your bookings below."
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/payments/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success && json.data?.confirmed) {
          setMessage("Payment confirmed. Your reservation is ready.");
          router.refresh();
        } else {
          setMessage(
            json.message ||
              "Payment received. It may take a moment to appear in bookings."
          );
        }
      } catch {
        if (!cancelled) {
          setMessage(
            "Payment received. If a booking is missing, refresh in a few seconds."
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
        Payment received
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#67717A] sm:text-base">
        {message}
      </p>
      <Link
        href="/dashboard/bookings"
        className="mt-8 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
      >
        View bookings
      </Link>
    </div>
  );
}
