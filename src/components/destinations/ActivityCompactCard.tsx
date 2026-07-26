"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ActivityCardData } from "@/lib/destinations/queries";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";
import { DestinationImage } from "./DestinationImage";

type ActivityCompactCardProps = {
  activity: ActivityCardData;
  destinationId: string;
  tripDays: number;
  requiresTravelDocuments: boolean;
  isAuthenticated: boolean;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function ActivityCompactCard({
  activity,
  destinationId,
  tripDays,
  requiresTravelDocuments,
  isAuthenticated,
}: ActivityCompactCardProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const formatMoney = useFormatMoney();
  const image = activity.image || "/images/dest2.jpg";
  const soldOut = activity.remainingSlots <= 0 || !activity.isAvailable;
  const isFree = activity.price === 0;

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
  const [, startTransition] = useTransition();

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

  function openBooking() {
    if (soldOut) return;
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

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationId,
          activityId: activity.id,
          usePassportDetails,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Booking failed");
        return;
      }

      const bookingId = json.data?._id ?? json.data?.id;
      if (!bookingId) {
        setError("Booking created but missing id");
        return;
      }

      if (isFree) {
        setSuccess("Booking reserved. View it under Bookings.");
        setOpen(false);
        startTransition(() => {
          router.refresh();
          router.push("/dashboard/bookings");
        });
        return;
      }

      setSuccess("Booking reserved. Open payment…");

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

      setOpen(false);
      setClientSecret(checkoutJson.data.clientSecret as string);
    } catch {
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

  return (
    <>
      <article
        className={`group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_6px_20px_rgba(1,42,62,0.08)] ring-1 ring-[#e8eef0] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(1,42,62,0.12)] sm:w-full ${
          soldOut ? "opacity-70" : "cursor-pointer"
        }`}
      >
        <button
          type="button"
          onClick={openBooking}
          disabled={soldOut}
          className="flex w-full flex-1 flex-col text-left disabled:cursor-not-allowed"
          aria-label={
            soldOut
              ? `${activity.title} — sold out`
              : `Book ${activity.title}`
          }
        >
          <div className="relative aspect-[5/3.2] w-full bg-[#e8eef0]">
            <DestinationImage
              src={image}
              alt={activity.title}
              fill
              sizes="208px"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            {soldOut ? (
              <span className="absolute top-2 left-2 rounded-md bg-[#012A3E]/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                Sold out
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#012A3E]">
              {activity.title}
            </h3>
            <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[#67717A]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {formatDuration(activity.duration)}
              </span>
              <span className="font-semibold text-[#127E83]">
                {isFree ? "Free" : formatMoney(activity.price)}
              </span>
            </div>
            <span
              className={`mt-1 inline-flex w-full items-center justify-center rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                soldOut
                  ? "bg-[#e8eef0] text-[#94A3B8]"
                  : "bg-[#127E83] text-white group-hover:bg-[#0f6d71]"
              }`}
            >
              {soldOut ? "Unavailable" : "Book experience"}
            </span>
          </div>
        </button>
      </article>

      {open && mounted
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
                  Book {activity.title}
                </h2>
                <p className="mt-1 text-sm text-[#67717A]">
                  {isFree
                    ? "Free · one seat for you"
                    : `From ${formatMoney(activity.price)} · one spot for you`}
                </p>

                <div className="mt-4 rounded-xl bg-[#F4FAFB] px-3.5 py-3 text-sm text-[#475569]">
                  <p className="font-medium text-[#012A3E]">Trip duration</p>
                  <p className="mt-0.5">
                    {tripDays} {tripDays === 1 ? "day" : "days"}
                    <span className="text-[#67717A]">
                      {" "}
                      · experience {formatDuration(activity.duration)}
                    </span>
                  </p>
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
                      {submitting
                        ? "Booking…"
                        : isFree
                          ? "Confirm"
                          : "Book & pay"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      <PaymentCheckoutModal
        open={Boolean(clientSecret)}
        clientSecret={clientSecret}
        title={`Pay for ${activity.title}`}
        onClose={closePayment}
        onComplete={handlePaymentComplete}
      />
    </>
  );
}
