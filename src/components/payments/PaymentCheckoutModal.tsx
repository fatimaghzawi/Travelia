"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getStripeBrowser } from "@/lib/stripe-browser";

type PaymentCheckoutModalProps = {
  open: boolean;
  clientSecret: string | null;
  sessionId?: string | null;
  title?: string;
  onClose: () => void;
  onComplete: () => void;
};

function resolveSessionId(
  sessionId: string | null | undefined,
  clientSecret: string
) {
  if (sessionId) return sessionId;
  if (clientSecret.includes("_secret_")) {
    return clientSecret.split("_secret_")[0] ?? null;
  }
  return null;
}

export function PaymentCheckoutModal({
  open,
  clientSecret,
  sessionId,
  title = "Complete payment",
  onClose,
  onComplete,
}: PaymentCheckoutModalProps) {
  const dialogTitleId = useId();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function confirmWithRetries(id: string) {
    let lastMessage = "Payment not confirmed yet";
    for (let i = 0; i < 8; i++) {
      const res = await fetch("/api/payments/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.confirmed) {
        return true;
      }
      lastMessage = json.message || lastMessage;
      await new Promise((r) => setTimeout(r, 800));
    }
    throw new Error(lastMessage);
  }

  async function handleComplete() {
    const id = resolveSessionId(sessionId, clientSecret || "");
    if (!id) {
      setConfirmError("Missing checkout session. Please contact support.");
      return;
    }

    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmWithRetries(id);
      onComplete();
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : "Paid, but confirmation is delayed. Open Bookings in a moment."
      );
    } finally {
      setConfirming(false);
    }
  }

  if (!open || !mounted || !clientSecret) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[#012A3E]/50 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={() => !confirming && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e8eef0] px-5 py-4">
          <h2
            id={dialogTitleId}
            className="text-lg font-semibold text-[#012A3E]"
          >
            {title}
          </h2>
          <button
            type="button"
            disabled={confirming}
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#67717A] hover:bg-[#F4F6F8] hover:text-[#012A3E] disabled:opacity-50"
            aria-label="Close payment"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4">
          {confirming ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <p className="text-sm font-semibold text-[#012A3E]">
                Confirming your payment…
              </p>
              <p className="text-xs text-[#67717A]">
                Updating your booking status. This takes a few seconds.
              </p>
            </div>
          ) : (
            <EmbeddedCheckoutProvider
              stripe={getStripeBrowser()}
              options={{
                clientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
          {confirmError ? (
            <div className="space-y-2 px-3 pb-4">
              <p className="text-sm text-red-600" role="alert">
                {confirmError}
              </p>
              <button
                type="button"
                className="text-sm font-semibold text-[#127E83] hover:underline"
                onClick={() => void handleComplete()}
              >
                Try confirming again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
