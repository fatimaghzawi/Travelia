"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  MapPin,
  Plane,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  ListPagination,
  type ListPaginationMeta,
} from "@/components/ui/ListPagination";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";

export type BookingLineItem = {
  id: string;
  title: string;
  subtitle: string | null;
  kind: "trip" | "experience";
  price: number;
  currency: string;
  travelDate: string;
  departureDate: string | null;
  returnDate: string | null;
  status: string;
  canCancel: boolean;
  guideIncluded: boolean;
};

export type BookingReservation = {
  id: string;
  confirmationCode: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  status: "confirmed" | "completed" | string;
  canCancelAny: boolean;
  /** upcoming = not started; active = travel in progress; past = finished */
  lifecycle: "upcoming" | "active" | "past";
  destination: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    slug: string | null;
    thumbnail: string | null;
  } | null;
  lines: BookingLineItem[];
};

type BookingsPageUiProps = {
  upcoming: BookingReservation[];
  past: BookingReservation[];
  upcomingTotal: number;
  pastTotal: number;
  meta: ListPaginationMeta;
  tab: "upcoming" | "past";
  initialQuery: string;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CancelDialog({
  line,
  open,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  line: BookingLineItem | null;
  open: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  if (!open || !line || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[#012A3E]/55 p-3 sm:items-center sm:p-5"
      role="presentation"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-[#012A3E]">
          Cancel this item?
        </h2>
        <p className="mt-2 text-sm text-[#67717A]">
          <span className="font-medium text-[#012A3E]">{line.title}</span> will
          be cancelled and the seat released.
          {line.kind === "trip"
            ? " Related activities on this destination journey will be cancelled automatically."
            : null}
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#d7e0e4] px-3 py-2.5 text-sm font-medium text-[#012A3E]"
          >
            Keep
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#E4574A] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TicketCard({
  reservation,
  onCancelLine,
}: {
  reservation: BookingReservation;
  onCancelLine: (line: BookingLineItem) => void;
}) {
  const reduce = useReducedMotion();
  const formatMoney = useFormatMoney();
  const thumb =
    reservation.destination?.thumbnail || "/images/dest2.jpg";

  const tripLine = reservation.lines.find((l) => l.kind === "trip");
  const dateLabel =
    tripLine?.departureDate && tripLine?.returnDate
      ? `${formatDate(tripLine.departureDate)} — ${formatDate(tripLine.returnDate)}`
      : formatDate(reservation.lines[0]?.travelDate);

  const heroLabel =
    reservation.lifecycle === "active"
      ? "In progress"
      : reservation.lifecycle === "past"
        ? "Past trip"
        : "Upcoming";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(1,42,62,0.08)] ring-1 ring-[#e8eef0] ${
        reservation.lifecycle === "past" ? "opacity-85" : ""
      }`}
    >
      <div className="relative h-32 sm:h-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#012A3E] via-[#012A3E]/55 to-[#012A3E]/15" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#9aebed] uppercase">
              {heroLabel}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-white sm:text-xl">
              {reservation.destination?.title ?? "Travelia booking"}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80 sm:text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">
                {[reservation.destination?.city, reservation.destination?.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-2.5 py-1.5 text-right backdrop-blur-sm ring-1 ring-white/20">
            <p className="text-[10px] font-medium text-white/70 uppercase">
              Total
            </p>
            <p className="font-display text-base font-semibold text-white">
              {formatMoney(reservation.amount)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-3.5 py-3.5 sm:px-4 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#d7e0e4] pb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
              Booking ref
            </p>
            <p className="mt-0.5 font-mono text-xs font-semibold tracking-[0.12em] text-[#012A3E] sm:text-sm">
              {reservation.confirmationCode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
              Travel dates
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#012A3E] sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-[#127E83]" />
              {dateLabel}
            </p>
          </div>
        </div>

        <motion.ul
          className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-0.5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.15 },
            },
          }}
        >
          {reservation.lines.map((line, index) => (
            <motion.li
              key={line.id}
              className="flex items-start gap-2.5 rounded-xl bg-[#F4FAFB] px-2.5 py-2"
              variants={{
                hidden: reduce ? { opacity: 1 } : { opacity: 0, x: -10 },
                show: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#127E83] ring-1 ring-[#d1e8ea]">
                {line.kind === "trip" ? (
                  <Plane className="h-3 w-3" strokeWidth={1.75} />
                ) : (
                  <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#012A3E]">
                      <span className="mr-1 text-[#94A3B8]">{index + 1}.</span>
                      {line.title}
                    </p>
                    {line.subtitle ? (
                      <p className="mt-0.5 truncate text-xs text-[#67717A]">
                        {line.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#012A3E]">
                      {line.price <= 0
                        ? "Included"
                        : formatMoney(line.price)}
                    </span>
                    {line.canCancel ? (
                      <button
                        type="button"
                        onClick={() => onCancelLine(line)}
                        className="text-xs font-medium text-[#E4574A] hover:underline"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="text-xs text-[#94A3B8]">
            {reservation.paidAt
              ? `Paid ${formatDate(reservation.paidAt)}`
              : "Paid"}
            {" · "}
            {reservation.lifecycle === "past"
              ? "Completed"
              : reservation.lifecycle === "active"
                ? "In progress"
                : "Confirmed"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function BookingsPageUi({
  upcoming,
  past,
  upcomingTotal,
  pastTotal,
  meta,
  tab,
  initialQuery,
}: BookingsPageUiProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<BookingLineItem | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const syncedQuery = useRef(false);

  useEffect(() => {
    if (!syncedQuery.current) {
      syncedQuery.current = true;
      return;
    }
    setQuery(initialQuery);
  }, [initialQuery]);

  const list = tab === "upcoming" ? upcoming : past;
  const hasSearch = Boolean(initialQuery.trim());

  function buildHref(overrides: {
    tab?: "upcoming" | "past";
    page?: number;
    q?: string;
  }) {
    const params = new URLSearchParams();
    const nextTab = overrides.tab ?? tab;
    const nextQ = overrides.q ?? initialQuery;
    const nextPage = overrides.page ?? 1;

    params.set("tab", nextTab);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    return `/dashboard/bookings?${params.toString()}`;
  }

  function pushFilters(next: { q?: string; tab?: "upcoming" | "past" }) {
    startTransition(() => {
      router.push(
        buildHref({
          q: next.q ?? query,
          tab: next.tab ?? tab,
          page: 1,
        })
      );
    });
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim() === initialQuery.trim()) return;
      pushFilters({ q: query });
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [query, initialQuery]);

  function hrefForPage(page: number) {
    return buildHref({ page });
  }

  function switchTab(next: "upcoming" | "past") {
    pushFilters({ tab: next, q: initialQuery });
  }

  function clearSearch() {
    setQuery("");
    startTransition(() => {
      router.push(`/dashboard/bookings?tab=${tab}`);
    });
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${cancelTarget.id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Could not cancel booking");
        return;
      }
      setCancelTarget(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not cancel booking. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
          My bookings
        </h1>
        <p className="mt-1 text-sm text-[#67717A]">
          Paid reservations stay here as history. Manage the live trip under{" "}
          <Link href="/dashboard/trips" className="font-medium text-[#127E83] hover:underline">
            My trips
          </Link>
          . Cancel is only available before travel starts.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full bg-[#F4FAFB] p-1 ring-1 ring-[#d1e8ea]">
            <button
              type="button"
              onClick={() => switchTab("upcoming")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === "upcoming"
                  ? "bg-[#012A3E] text-white"
                  : "text-[#67717A] hover:text-[#012A3E]"
              }`}
            >
              Upcoming ({upcomingTotal})
            </button>
            <button
              type="button"
              onClick={() => switchTab("past")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === "past"
                  ? "bg-[#012A3E] text-white"
                  : "text-[#67717A] hover:text-[#012A3E]"
              }`}
            >
              History ({pastTotal})
            </button>
          </div>

          <label className="relative w-full min-w-0 sm:max-w-md sm:flex-1">
            <span className="sr-only">Search bookings</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67717A]"
              strokeWidth={2}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destination, ref, experience…"
              className="w-full rounded-xl border border-[#d1e8ea] bg-white py-2 pl-10 pr-3 text-sm text-[#012A3E] outline-none transition placeholder:text-[#67717A]/70 focus:border-[#127E83]/50 focus:ring-2 focus:ring-[#127E83]/15"
            />
          </label>
        </div>

        {hasSearch ? (
          <button
            type="button"
            onClick={clearSearch}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#127E83] hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        ) : null}
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d1e8ea] bg-[#F4FAFB] px-6 py-14 text-center">
          <p className="text-base font-medium text-[#012A3E]">
            {hasSearch
              ? "No bookings match your search"
              : tab === "upcoming"
                ? "No upcoming bookings"
                : "No booking history yet"}
          </p>
          <p className="mt-1.5 text-sm text-[#67717A]">
            {hasSearch
              ? "Try another destination or booking ref."
              : tab === "upcoming"
                ? "Book a destination journey to see it here before travel starts."
                : "In-progress and finished bookings appear here as history."}
          </p>
          {hasSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
            >
              Clear search
            </button>
          ) : (
            <Link
              href="/destinations"
              className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
            >
              Explore destinations
            </Link>
          )}
        </div>
      ) : (
        <>
          <motion.ul
            key={tab}
            className="relative grid gap-5 sm:grid-cols-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: reduce ? 0 : 0.12 },
              },
            }}
          >
            {list.map((r) => (
              <motion.li
                key={r.id}
                className="min-w-0"
                variants={{
                  hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
              >
                <TicketCard reservation={r} onCancelLine={setCancelTarget} />
              </motion.li>
            ))}
          </motion.ul>
          <ListPagination meta={meta} hrefForPage={hrefForPage} />
        </>
      )}

      <CancelDialog
        line={cancelTarget}
        open={Boolean(cancelTarget)}
        pending={pending}
        error={error}
        onClose={() => {
          if (!pending) {
            setCancelTarget(null);
            setError(null);
          }
        }}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
