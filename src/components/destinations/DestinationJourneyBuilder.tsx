"use client";

import { Clock, GripVertical, Plus, Route, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import type {
  ActivityCardData,
  TripPackageCardData,
} from "@/lib/destinations/queries";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";
import { BookingFlightOverlay } from "@/components/traveler/motion/TravelMotion";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";
import { DestinationImage } from "./DestinationImage";

type DestinationJourneyBuilderProps = {
  destinationId: string;
  destinationTitle: string;
  placeName: string;
  requiresTravelDocuments: boolean;
  isAuthenticated: boolean;
  packages: TripPackageCardData[];
  activities: ActivityCardData[];
  recommendedDays: number;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatPkgRange(departureIso: string, returnIso: string) {
  const dep = new Date(departureIso);
  const ret = new Date(returnIso);
  return `${dep.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${ret.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function DestinationJourneyBuilder({
  destinationId,
  destinationTitle,
  placeName,
  requiresTravelDocuments,
  isAuthenticated,
  packages,
  activities,
  recommendedDays,
}: DestinationJourneyBuilderProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const dropRef = useRef<HTMLDivElement>(null);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [journeyIds, setJourneyIds] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pulseTotal, setPulseTotal] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [usePassportDetails, setUsePassportDetails] = useState(
    requiresTravelDocuments
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flightPhase, setFlightPhase] = useState<
    "idle" | "packing" | "flying" | "done"
  >("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const formatMoney = useFormatMoney();
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(
    null
  );
  const [, startTransition] = useTransition();

  const selectedPackage =
    packages.find((p) => p.id === selectedPackageId) ?? null;

  const journeyActivities = useMemo(
    () =>
      journeyIds
        .map((id) => activities.find((a) => a.id === id))
        .filter(Boolean) as ActivityCardData[],
    [journeyIds, activities]
  );

  const total =
    (selectedPackage?.price ?? 0) +
    journeyActivities.reduce((sum, a) => sum + a.price, 0);

  const prevTotal = useRef(total);
  useEffect(() => {
    if (prevTotal.current === total) return;
    prevTotal.current = total;
    setPulseTotal(true);
    const t = window.setTimeout(() => setPulseTotal(false), 450);
    return () => window.clearTimeout(t);
  }, [total]);

  function requireAuth(): boolean {
    if (isAuthenticated) return true;
    router.push(
      `/login?callbackUrl=${encodeURIComponent(`/destinations/${destinationId}`)}`
    );
    return false;
  }

  function addActivity(id: string) {
    if (!requireAuth()) return;
    if (!selectedPackageId) {
      setError("Select a trip departure before adding experiences");
      return;
    }
    const activity = activities.find((a) => a.id === id);
    if (!activity || !activity.isAvailable || activity.remainingSlots <= 0) {
      return;
    }
    setError(null);
    setJourneyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeActivity(id: string) {
    setJourneyIds((prev) => prev.filter((x) => x !== id));
  }

  function togglePackage(pkg: TripPackageCardData) {
    if (!requireAuth()) return;
    if (pkg.status === "full" || pkg.remainingSlots <= 0) return;
    setSelectedPackageId((prev) => {
      if (prev === pkg.id) {
        setJourneyIds([]);
        return null;
      }
      return pkg.id;
    });
    setError(null);
  }

  function onDragStart(e: DragEvent, activityId: string) {
    e.dataTransfer.setData("text/activity-id", activityId);
    e.dataTransfer.effectAllowed = "copy";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!selectedPackageId) {
      setError("Select a trip departure before adding experiences");
      return;
    }
    const id = e.dataTransfer.getData("text/activity-id");
    if (id) addActivity(id);
  }

  function openCheckout() {
    if (!requireAuth()) return;
    if (!selectedPackage) {
      setError("Select a trip departure to continue");
      return;
    }
    setError(null);
    setCheckoutOpen(true);
  }

  async function submitJourney(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setFlightPhase("packing");

    try {
      await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 700));
      setFlightPhase("flying");

      const res = await fetch("/api/bookings/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationId,
          tripPackageId: selectedPackageId,
          activityIds: journeyIds,
          usePassportDetails,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFlightPhase("idle");
        setError(json.message || "Could not reserve your journey");
        return;
      }

      setFlightPhase("done");
      await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 500));

      if (json.data?.free || !json.data?.clientSecret) {
        setCheckoutOpen(false);
        setFlightPhase("idle");
        setJourneyIds([]);
        setSelectedPackageId(null);
        startTransition(() => {
          router.refresh();
          router.push("/dashboard/bookings");
        });
        return;
      }

      setCheckoutOpen(false);
      setFlightPhase("idle");
      setClientSecret(json.data.clientSecret as string);
      setCheckoutSessionId(
        (json.data.sessionId as string | undefined) ?? null
      );
    } catch {
      setFlightPhase("idle");
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function closePayment() {
    setClientSecret(null);
    setCheckoutSessionId(null);
    startTransition(() => router.refresh());
  }

  function handlePaymentComplete() {
    setClientSecret(null);
    setCheckoutSessionId(null);
    setJourneyIds([]);
    setSelectedPackageId(null);
    startTransition(() => {
      router.refresh();
      router.push("/dashboard/bookings");
    });
  }

  const openPackages = packages.filter(
    (p) => p.status === "open" && p.remainingSlots > 0
  );

  return (
    <div id="build-journey" className="scroll-mt-24 space-y-10 sm:space-y-12">
      {/* Trip departures — pick one into the journey */}
      <section id="available-trips" className="scroll-mt-24">
        <div className="mb-3">
          <h2 className="font-display text-xl font-semibold tracking-tight text-[#012A3E] sm:text-2xl">
            Pick a departure
          </h2>
        </div>

        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d1e8ea] bg-[#F4FAFB] px-4 py-6 text-center text-sm text-[#67717A]">
            No upcoming trips — experiences can be added once a departure is
            available.
          </div>
        ) : (
          <ul className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
            {packages.map((pkg) => {
              const soldOut =
                pkg.status === "full" || pkg.remainingSlots <= 0;
              const selected = selectedPackageId === pkg.id;
              return (
                <li key={pkg.id}>
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => togglePackage(pkg)}
                    className={`group relative flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-xl p-3 text-left ring-1 transition sm:w-[12.5rem] ${
                      soldOut
                        ? "cursor-not-allowed bg-[#F4F6F8] opacity-75 ring-[#e8eef0]"
                        : selected
                          ? "bg-[#127E83] text-white ring-[#127E83] shadow-[0_10px_28px_rgba(18,126,131,0.28)]"
                          : "bg-[#F4FAFB] ring-[#d1e8ea] hover:-translate-y-0.5 hover:ring-[#127E83]/40"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-medium ${selected ? "text-white/80" : "text-[#67717A]"}`}
                    >
                      {pkg.title || formatPkgRange(pkg.departureDate, pkg.returnDate)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${selected ? "text-white" : "text-[#012A3E]"}`}
                    >
                      {formatPkgRange(pkg.departureDate, pkg.returnDate)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className={selected ? "text-white/80" : "text-[#67717A]"}>
                        {soldOut ? "Full" : `${pkg.remainingSlots} left`}
                      </span>
                      <span
                        className={`font-semibold ${selected ? "text-white" : "text-[#127E83]"}`}
                      >
                        {formatMoney(pkg.price)}
                      </span>
                    </div>
                    <span
                      className={`mt-2 inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
                        soldOut
                          ? "bg-[#e8eef0] text-[#94A3B8]"
                          : selected
                            ? "bg-white/15 text-white"
                            : "bg-[#127E83] text-white"
                      }`}
                    >
                      {soldOut
                        ? "Unavailable"
                        : selected
                          ? "In your journey"
                          : "Add to journey"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {openPackages.length === 0 && packages.length > 0 ? (
          <p className="mt-2 text-xs text-[#67717A]">
            All listed departures are full — check back for new dates.
          </p>
        ) : null}
      </section>

      {/* Journey builder */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-10">
        {/* Left: journey tray */}
        <aside
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative flex flex-col rounded-2xl p-5 transition duration-300 sm:p-6 lg:sticky lg:top-28 lg:self-start lg:p-7 ${
            dragOver
              ? "bg-[#e7f7f8] ring-2 ring-[#127E83] ring-offset-2"
              : "bg-[#F4FAFB] ring-1 ring-[#d1e8ea]"
          }`}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#127E83]" />
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#012A3E] sm:text-4xl">
                Your journey
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#67717A]">
                Pick a departure, then drag experiences here to shape your stay
                in {placeName}. Pay once when you&apos;re happy.
              </p>
            </div>
          </div>

          <div
            className={`mt-5 min-h-[12rem] flex-1 space-y-2 rounded-xl border border-dashed px-3 py-3 transition ${
              dragOver
                ? "border-[#127E83] bg-white/80"
                : "border-[#c9dde0] bg-white/50"
            }`}
          >
            {!selectedPackage ? (
              <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-2 text-center">
                <GripVertical className="h-6 w-6 text-[#94A3B8]" />
                <p className="text-sm font-medium text-[#012A3E]">
                  Select a trip departure first
                </p>
                <p className="text-xs text-[#67717A]">
                  Then add experiences from the list
                </p>
              </div>
            ) : journeyActivities.length === 0 ? (
              <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-2 text-center">
                <GripVertical className="h-6 w-6 text-[#94A3B8]" />
                <p className="text-sm font-medium text-[#012A3E]">
                  Drop activities here
                </p>
                <p className="text-xs text-[#67717A]">
                  Or tap + on a card to add it
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedPackage ? (
                  <li className="animate-[journeyIn_0.35s_ease-out] rounded-xl bg-[#012A3E] px-3 py-2.5 text-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-wider text-[#9aebed] uppercase">
                          Trip base
                        </p>
                        <p className="truncate text-sm font-semibold">
                          {selectedPackage.title ||
                            formatPkgRange(
                              selectedPackage.departureDate,
                              selectedPackage.returnDate
                            )}
                        </p>
                        <p className="text-xs text-white/70">
                          {formatPkgRange(
                            selectedPackage.departureDate,
                            selectedPackage.returnDate
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">
                          {formatMoney(selectedPackage.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedPackageId(null)}
                          className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                          aria-label="Remove trip from journey"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ) : null}

                {journeyActivities.map((activity, index) => (
                  <li
                    key={activity.id}
                    className="animate-[journeyIn_0.35s_ease-out] flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-[#e8eef0]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4FAFB] text-xs font-semibold text-[#127E83]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#012A3E]">
                        {activity.title}
                      </p>
                      <p className="text-[11px] text-[#67717A]">
                        {formatDuration(activity.duration)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#127E83]">
                      {activity.price === 0
                        ? "Free"
                        : formatMoney(activity.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeActivity(activity.id)}
                      className="rounded-md p-1 text-[#94A3B8] hover:bg-[#F4F6F8] hover:text-[#012A3E]"
                      aria-label={`Remove ${activity.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 border-t border-[#d1e8ea] pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">
                  Journey total
                </p>
                <p
                  className={`font-display text-3xl font-semibold text-[#012A3E] transition duration-300 ${
                    pulseTotal ? "scale-105 text-[#127E83]" : ""
                  }`}
                >
                  {formatMoney(total)}
                </p>
              </div>
              <p className="pb-1 text-xs text-[#67717A]">
                {journeyActivities.length + (selectedPackage ? 1 : 0)} item
                {journeyActivities.length + (selectedPackage ? 1 : 0) === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={openCheckout}
              disabled={!selectedPackage}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#127E83] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f6d71] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Continue to payment
            </button>
            {error && !checkoutOpen ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </aside>

        {/* Right: activity catalog */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 sm:mb-5">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-[#012A3E] sm:text-2xl">
                Experiences in {placeName}
              </h3>
              <p className="mt-1 text-sm text-[#67717A]">
                ~{recommendedDays} day trip · pick a departure, then add
                experiences
              </p>
            </div>
            <span className="text-sm font-medium text-[#127E83]">
              {activities.length} available
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d1e8ea] bg-[#F4FAFB] px-5 py-10 text-center text-sm text-[#67717A]">
              No activities listed for this destination yet.
            </div>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3 [&::-webkit-scrollbar]:hidden">
              {activities.map((activity) => {
                const soldOut =
                  activity.remainingSlots <= 0 || !activity.isAvailable;
                const inJourney = journeyIds.includes(activity.id);
                const packageRequired = !selectedPackageId;
                const image = activity.image || "/images/dest2.jpg";

                return (
                  <article
                    key={activity.id}
                    draggable={!soldOut && !inJourney && !packageRequired}
                    onDragStart={(e) => {
                      if (soldOut || inJourney || packageRequired) {
                        e.preventDefault();
                        return;
                      }
                      onDragStart(e, activity.id);
                    }}
                    className={`group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_6px_20px_rgba(1,42,62,0.08)] ring-1 transition sm:w-full ${
                      soldOut || packageRequired
                        ? "opacity-60 ring-[#e8eef0]"
                        : inJourney
                          ? "ring-[#127E83] shadow-[0_10px_28px_rgba(18,126,131,0.18)]"
                          : "cursor-grab ring-[#e8eef0] active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(1,42,62,0.12)]"
                    }`}
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
                      ) : inJourney ? (
                        <span className="absolute top-2 left-2 rounded-md bg-[#127E83] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                          Added
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 rounded-md bg-white/90 px-1.5 py-1 text-[#127E83] shadow-sm">
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-[#012A3E]">
                        {activity.title}
                      </h4>
                      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[#67717A]">
                        <span className="inline-flex items-center gap-1">
                          <Clock
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                          {formatDuration(activity.duration)}
                        </span>
                        <span className="font-semibold text-[#127E83]">
                          {activity.price === 0
                            ? "Free"
                            : formatMoney(activity.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={soldOut || inJourney || packageRequired}
                        onClick={() => addActivity(activity.id)}
                        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                          soldOut || packageRequired
                            ? "bg-[#e8eef0] text-[#94A3B8]"
                            : inJourney
                              ? "bg-[#e7f7f8] text-[#127E83]"
                              : "bg-[#127E83] text-white hover:bg-[#0f6d71]"
                        }`}
                      >
                        {soldOut ? (
                          "Unavailable"
                        ) : packageRequired ? (
                          "Pick departure first"
                        ) : inJourney ? (
                          "In journey"
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Add to journey
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Checkout confirm modal */}
      {checkoutOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-[#012A3E]/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-5"
              role="presentation"
              onClick={() => !submitting && setCheckoutOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                className="animate-[journeyIn_0.35s_ease-out] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(1,42,62,0.25)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center justify-between gap-3 bg-[#012A3E] px-4 py-3.5 text-white">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.16em] text-[#9aebed] uppercase">
                      <Route className="h-3 w-3" strokeWidth={2} />
                      Ready to go
                    </p>
                    <h2
                      id={dialogTitleId}
                      className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight"
                    >
                      Your {placeName} chapter
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-display text-lg font-semibold text-[#9aebed]">
                      {formatMoney(total)}
                    </p>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setCheckoutOpen(false)}
                      className="rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={submitJourney} className="px-4 py-3.5">
                  <ul className="max-h-28 space-y-1.5 overflow-y-auto">
                    {selectedPackage ? (
                      <li className="flex items-center justify-between gap-2 rounded-xl bg-[#F4FAFB] px-2.5 py-1.5 text-xs">
                        <span className="min-w-0 truncate font-medium text-[#012A3E]">
                          <span className="mr-1.5 text-[#127E83]">1.</span>
                          {selectedPackage.title ||
                            formatPkgRange(
                              selectedPackage.departureDate,
                              selectedPackage.returnDate
                            )}
                        </span>
                        <span className="shrink-0 font-semibold text-[#012A3E]">
                          {formatMoney(selectedPackage.price)}
                        </span>
                      </li>
                    ) : null}
                    {journeyActivities.map((a, index) => {
                      const stop = (selectedPackage ? 1 : 0) + index + 1;
                      return (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs ring-1 ring-[#eef3f5]"
                        >
                          <span className="min-w-0 truncate font-medium text-[#012A3E]">
                            <span className="mr-1.5 text-[#127E83]">{stop}.</span>
                            {a.title}
                          </span>
                          <span className="shrink-0 font-semibold text-[#127E83]">
                            {a.price === 0
                              ? "Free"
                              : formatMoney(a.price)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <label className="mt-3 flex items-center gap-2.5 text-xs text-[#334155]">
                    <input
                      type="checkbox"
                      checked={usePassportDetails}
                      onChange={(e) => setUsePassportDetails(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d7e0e4] text-[#127E83]"
                    />
                    <span>
                      Use verified passport
                      {requiresTravelDocuments ? (
                        <span className="text-[#127E83]"> · required</span>
                      ) : null}
                    </span>
                  </label>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={1}
                    maxLength={500}
                    placeholder="Note for hosts (optional)"
                    className="mt-2 w-full resize-none rounded-xl border border-[#d7e0e4] px-3 py-2 text-xs text-[#012A3E] outline-none placeholder:text-[#94A3B8] focus:border-[#127E83]"
                  />

                  {error ? (
                    <p className="mt-2 text-xs text-red-600" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setCheckoutOpen(false)}
                      className="flex-1 rounded-xl border border-[#d7e0e4] px-3 py-2 text-xs font-medium text-[#012A3E] hover:bg-[#F4F6F8]"
                    >
                      Keep editing
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-[1.3] rounded-xl bg-[#127E83] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f6d71] disabled:opacity-60"
                    >
                      {submitting
                        ? "Packing…"
                        : total === 0
                          ? "Lock in"
                          : "Seal & pay"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      <BookingFlightOverlay
        open={flightPhase !== "idle"}
        phase={flightPhase === "idle" ? "packing" : flightPhase}
        title={`Booking your ${placeName} journey`}
      />

      <PaymentCheckoutModal
        open={Boolean(clientSecret)}
        clientSecret={clientSecret}
        sessionId={checkoutSessionId}
        title={`Pay for your ${placeName} journey`}
        onClose={closePayment}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
}
