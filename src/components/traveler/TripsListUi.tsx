"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, MapPin, Star, Wallet, X } from "lucide-react";
import {
  TripReviewPanel,
  type TripReviewData,
} from "@/components/traveler/TripReviewPanel";

import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";

export type TripsListCard = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  coverImage: string | null;
  destination: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    slug: string | null;
    thumbnail: string | null;
  } | null;
  existingReview: TripReviewData | null;
};

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

function statusTone(status: string) {
  if (status === "ongoing") return "bg-[#127E83] text-white";
  if (status === "completed") return "bg-[#012A3E] text-white";
  return "bg-[#E8EEF0] text-[#67717A]";
}

function TripCardView({
  trip,
  onReview,
}: {
  trip: TripsListCard;
  onReview?: () => void;
}) {
  const formatMoney = useFormatMoney();
  const thumb =
    trip.destination?.thumbnail || trip.coverImage || "/images/dest2.jpg";
  const place = [trip.destination?.city, trip.destination?.country]
    .filter(Boolean)
    .join(", ");
  const canReview =
    trip.status === "completed" && Boolean(trip.destination?.id);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(1,42,62,0.06)] ring-1 ring-[#e8eef0] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(1,42,62,0.1)]">
      <Link href={`/dashboard/trips/${trip.id}`} className="relative block h-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#012A3E] via-[#012A3E]/45 to-transparent" />
        <span
          className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${statusTone(trip.status)}`}
        >
          {trip.status}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="truncate font-display text-xl font-semibold text-white">
            {trip.title}
          </h3>
          {place ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-3.5 w-3.5" />
              {place}
            </p>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="inline-flex items-center gap-1.5 text-sm text-[#67717A]">
          <CalendarDays className="h-3.5 w-3.5 text-[#127E83]" />
          {formatRange(trip.startDate, trip.endDate)}
        </p>
        <div className="flex items-center justify-between rounded-xl bg-[#f8fafb] px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-[#67717A]">
            <Wallet className="h-3.5 w-3.5 text-[#127E83]" />
            Remaining
          </span>
          <span className="font-semibold text-[#012A3E]">
            {formatMoney(trip.remaining)}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Link
            href={`/dashboard/trips/${trip.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#012A3E] px-3 py-2 text-xs font-semibold text-white"
          >
            Open trip
          </Link>
          {canReview ? (
            <button
              type="button"
              onClick={onReview}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#C48A1A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#a87516]"
            >
              <Star className="h-3.5 w-3.5" />
              {trip.existingReview ? "Edit review" : "Review"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReviewModal({
  trip,
  open,
  onClose,
  onSaved,
}: {
  trip: TripsListCard;
  open: boolean;
  onClose: () => void;
  onSaved: (review: TripReviewData) => void;
}) {
  const titleId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted || !trip.destination) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#012A3E]/55 p-3 sm:items-center sm:p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8eef0] bg-white px-4 py-3">
          <div>
            <p id={titleId} className="text-sm font-semibold text-[#012A3E]">
              Review {trip.destination.title}
            </p>
            <p className="text-xs text-[#67717A]">{trip.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e8f0] text-[#012A3E]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-1 sm:p-2">
          <TripReviewPanel
            tripId={trip.id}
            destinationId={trip.destination.id}
            destinationTitle={trip.destination.title}
            destinationHref={`/destinations/${trip.destination.id}`}
            initialReview={trip.existingReview}
            compact
            onSaved={(review) => {
              onSaved(review);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TripsListUi({
  ongoing: initialOngoing,
  completed: initialCompleted,
  syncError,
}: {
  ongoing: TripsListCard[];
  completed: TripsListCard[];
  syncError?: string | null;
}) {
  const [ongoing, setOngoing] = useState(initialOngoing);
  const [completed, setCompleted] = useState(initialCompleted);
  const [reviewTrip, setReviewTrip] = useState<TripsListCard | null>(null);
  const empty = ongoing.length === 0 && completed.length === 0;

  useEffect(() => {
    setOngoing(initialOngoing);
    setCompleted(initialCompleted);
  }, [initialOngoing, initialCompleted]);

  function applyReview(tripId: string, review: TripReviewData) {
    const patch = (list: TripsListCard[]) =>
      list.map((t) => (t.id === tripId ? { ...t, existingReview: review } : t));
    setOngoing(patch);
    setCompleted(patch);
    setReviewTrip((current) =>
      current && current.id === tripId
        ? { ...current, existingReview: review }
        : current
    );
  }

  return (
    <div className="trips-list">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
          My trips
        </h1>
      </header>

      {syncError ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Trips loaded with a warning: {syncError}
        </p>
      ) : null}

      {empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d1e8ea] bg-white/70 px-6 py-14 text-center">
          <p className="text-base font-medium text-[#012A3E]">
            No active trips yet
          </p>
          <p className="mt-1.5 text-sm text-[#67717A]">
            Paid bookings appear here once the trip start date is reached.
          </p>
          <Link
            href="/dashboard/bookings"
            className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
          >
            View bookings
          </Link>
        </div>
      ) : (
        <>
          <Section
            title="Ongoing"
            trips={ongoing}
            empty="No trips in progress right now."
            onReview={setReviewTrip}
          />
          <Section
            title="Completed"
            trips={completed}
            empty="No completed trips yet."
            onReview={setReviewTrip}
          />
        </>
      )}

      {reviewTrip ? (
        <ReviewModal
          trip={reviewTrip}
          open
          onClose={() => setReviewTrip(null)}
          onSaved={(review) => applyReview(reviewTrip.id, review)}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  trips,
  empty,
  onReview,
}: {
  title: string;
  trips: TripsListCard[];
  empty: string;
  onReview: (trip: TripsListCard) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#012A3E]">{title}</h2>
      {trips.length === 0 ? (
        <p className="mt-3 text-sm text-[#67717A]">{empty}</p>
      ) : (
        <motion.ul
          className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: reduce ? 0 : 0.1 },
            },
          }}
        >
          {trips.map((trip) => (
            <motion.li
              key={trip.id}
              variants={{
                hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 28 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <TripCardView trip={trip} onReview={() => onReview(trip)} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
