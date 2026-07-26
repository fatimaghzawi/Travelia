"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Plane } from "lucide-react";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";
import { BookingFlightOverlay } from "@/components/traveler/motion/TravelMotion";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";

type BookButtonProps = {
  destinationId: string;
  tripPackageId?: string;
  activityId?: string;
  title: string;
  price: number;
  /** Shown for package bookings (departure → return). */
  departureLabel?: string;
  returnLabel?: string;
  guideIncluded?: boolean;
  /** Destination recommended days (info only). */
  tripDays?: number;
  activityDurationMinutes?: number;
  requiresTravelDocuments?: boolean;
  isAuthenticated: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  showArrow?: boolean;
};

function formatActivityDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function BookButton({
  destinationId,
  tripPackageId,
  activityId,
  title,
  price,
  departureLabel,
  returnLabel,
  guideIncluded,
  tripDays,
  activityDurationMinutes,
  requiresTravelDocuments = false,
  isAuthenticated,
  disabled = false,
  className = "",
  label = "Book",
  showArrow = false,
}: BookButtonProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [usePassportDetails, setUsePassportDetails] = useState(
    requiresTravelDocuments
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [flightPhase, setFlightPhase] = useState<
    "idle" | "packing" | "flying" | "done"
  >("idle");
  const [, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const formatMoney = useFormatMoney();

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

  function openModal() {
    setError(null);
    setSuccess(null);
    if (!isAuthenticated) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/destinations/${destinationId}`)}`
      );
      return;
    }
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    setFlightPhase("packing");

    try {
      await new Promise((r) => setTimeout(r, reduce ? 0 : 700));
      setFlightPhase("flying");

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationId,
          tripPackageId: tripPackageId ?? null,
          activityId: activityId ?? null,
          usePassportDetails,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFlightPhase("idle");
        setError(json.message || "Booking failed");
        return;
      }

      const bookingId = json.data?._id ?? json.data?.id;
      if (!bookingId) {
        setFlightPhase("idle");
        setError("Booking created but missing id");
        return;
      }

      setSuccess("Booking reserved. Open payment…");
      setFlightPhase("done");

      const checkoutRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: String(bookingId) }),
      });
      const checkoutJson = await checkoutRes.json();
      if (
        !checkoutRes.ok ||
        !checkoutJson.success ||
        !checkoutJson.data?.clientSecret
      ) {
        setFlightPhase("idle");
        setError(
          checkoutJson.message ||
            "Booking saved, but checkout failed. Pay from Bookings."
        );
        startTransition(() => {
          router.refresh();
          router.push("/dashboard/bookings");
        });
        return;
      }

      await new Promise((r) => setTimeout(r, reduce ? 0 : 500));
      setOpen(false);
      setFlightPhase("idle");
      setClientSecret(checkoutJson.data.clientSecret as string);
    } catch {
      setFlightPhase("idle");
      setError("Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function closePayment() {
    setClientSecret(null);
    startTransition(() => router.refresh());
  }

  function handlePaymentComplete() {
    setClientSecret(null);
    startTransition(() => {
      router.refresh();
      router.push("/dashboard/bookings");
    });
  }

  const isPackage = Boolean(tripPackageId);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#012A3E]/45 p-3 sm:items-center sm:p-6"
            role="presentation"
            onClick={() => !submitting && setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id={dialogTitleId}
                className="text-lg font-semibold text-[#012A3E]"
              >
                Book {title}
              </h2>
              <p className="mt-1 text-sm text-[#67717A]">
                {formatMoney(price)} · one spot for you
              </p>

              <div className="mt-4 rounded-xl bg-[#F4FAFB] px-3.5 py-3 text-sm text-[#475569]">
                {isPackage && departureLabel && returnLabel ? (
                  <>
                    <p className="font-medium text-[#012A3E]">Trip dates</p>
                    <p className="mt-0.5">
                      {departureLabel} → {returnLabel}
                    </p>
                    {guideIncluded ? (
                      <p className="mt-1 text-xs text-[#127E83]">
                        Guide included
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-[#012A3E]">Experience</p>
                    <p className="mt-0.5">
                      {typeof tripDays === "number"
                        ? `${tripDays} ${tripDays === 1 ? "day" : "days"} trip`
                        : "Activity booking"}
                      {typeof activityDurationMinutes === "number" ? (
                        <span className="text-[#67717A]">
                          {" "}
                          · {formatActivityDuration(activityDurationMinutes)}
                        </span>
                      ) : null}
                    </p>
                  </>
                )}
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="flex items-start gap-3 text-sm text-[#334155]">
                  <input
                    type="checkbox"
                    checked={usePassportDetails}
                    onChange={(e) => setUsePassportDetails(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#d7e0e4] text-[#127E83]"
                  />
                  <span>
                    Use my verified passport details
                    {requiresTravelDocuments ? (
                      <span className="block text-xs text-[#127E83]">
                        Required for this destination
                      </span>
                    ) : null}
                  </span>
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-[#012A3E]">
                    Notes (optional)
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-[#d7e0e4] px-3 py-2.5 text-[#012A3E] outline-none focus:border-[#127E83]"
                  />
                </label>

                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="text-sm text-[#127E83]" role="status">
                    {success}
                  </p>
                ) : null}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-[#d7e0e4] px-4 py-2.5 text-sm font-medium text-[#012A3E] hover:bg-[#F4F6F8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71] disabled:opacity-60"
                  >
                    {submitting ? "Booking…" : "Book & pay"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <motion.button
        type="button"
        onClick={openModal}
        disabled={disabled}
        whileHover={reduce || disabled ? undefined : { scale: 1.04, y: -2 }}
        whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f6d71] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <motion.span
          className="inline-flex"
          animate={reduce ? undefined : { x: [0, 3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Plane className="h-4 w-4 -rotate-45" strokeWidth={2} />
        </motion.span>
        {label}
        {showArrow ? (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        ) : null}
      </motion.button>
      {modal}
      <BookingFlightOverlay
        open={flightPhase !== "idle"}
        phase={flightPhase === "idle" ? "packing" : flightPhase}
        title={`Booking ${title}`}
      />
      <PaymentCheckoutModal
        open={Boolean(clientSecret)}
        clientSecret={clientSecret}
        title={`Pay for ${title}`}
        onClose={closePayment}
        onComplete={handlePaymentComplete}
      />
    </>
  );
}
