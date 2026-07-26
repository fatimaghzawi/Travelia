"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";

type PayNowButtonProps = {
  bookingId: string;
  className?: string;
  label?: string;
};

export function PayNowButton({
  bookingId,
  className = "",
  label = "Pay now",
}: PayNowButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.clientSecret) {
        setError(json.message || "Could not start checkout");
        return;
      }
      setClientSecret(json.data.clientSecret as string);
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function closeCheckout() {
    setClientSecret(null);
    router.refresh();
  }

  function handleComplete() {
    setClientSecret(null);
    router.refresh();
    router.push("/dashboard/bookings");
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className={`inline-flex items-center justify-center rounded-xl bg-[#127E83] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f6d71] disabled:opacity-60 ${className}`}
      >
        {pending ? "Loading…" : label}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <PaymentCheckoutModal
        open={Boolean(clientSecret)}
        clientSecret={clientSecret}
        onClose={closeCheckout}
        onComplete={handleComplete}
      />
    </div>
  );
}
