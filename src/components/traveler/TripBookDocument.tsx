"use client";

import { useEffect, useRef } from "react";
import { Download, Printer, X } from "lucide-react";
import type { TripDayData } from "@/components/traveler/trip-day-types";

const MOODS: Record<string, { label: string; emoji: string }> = {
  happy: { label: "Happy", emoji: "😊" },
  adventurous: { label: "Adventurous", emoji: "🧭" },
  relaxed: { label: "Relaxed", emoji: "🌴" },
  tired: { label: "Tired", emoji: "😴" },
  romantic: { label: "Romantic", emoji: "💛" },
  amazed: { label: "Amazed", emoji: "✨" },
  grateful: { label: "Grateful", emoji: "🙏" },
};

export type TripBookTrip = {
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  coverImage: string | null;
  destination: {
    title: string;
    city: string | null;
    country: string | null;
  } | null;
};

type TripBookDocumentProps = {
  trip: TripBookTrip;
  days: TripDayData[];
  tripId: string;
  /** When true, hide on-screen chrome and auto-open print dialog */
  autoPrint?: boolean;
};

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

function dayHasContent(day: TripDayData) {
  const j = day.journal;
  if (!j) return false;
  return (
    (j.photos?.length ?? 0) > 0 ||
    Boolean(j.memory?.trim()) ||
    Boolean(j.mood) ||
    Boolean(j.rating) ||
    (j.places?.length ?? 0) > 0
  );
}

export function TripBookDocument({
  trip,
  days,
  tripId,
  autoPrint = false,
}: TripBookDocumentProps) {
  const cover =
    trip.coverImage ||
    "/images/dest3.jpg";
  const place = [trip.destination?.city, trip.destination?.country]
    .filter(Boolean)
    .join(", ");
  const storyDays = days.filter(dayHasContent);
  const pages = storyDays.length > 0 ? storyDays : days;

  const printed = useRef(false);
  useEffect(() => {
    if (!autoPrint || printed.current) return;
    printed.current = true;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="trip-book bg-white text-[#012A3E]">
      {/* Screen-only toolbar */}
      <div className="trip-book-toolbar no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eef0] bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#127E83] uppercase">
            Travelia book
          </p>
          <p className="text-sm text-[#67717A]">
            Preview · Print or save as PDF
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#012A3E] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
          <a
            href={`/dashboard/trips/${tripId}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4FAFB] px-4 py-2.5 text-sm font-semibold text-[#012A3E] ring-1 ring-[#e8eef0]"
          >
            <X className="h-4 w-4" />
            Close
          </a>
        </div>
      </div>

      <div className="trip-book-pages mx-auto max-w-[210mm]">
        {/* ——— COVER ——— */}
        <section className="trip-book-page trip-book-cover relative flex min-h-[297mm] flex-col overflow-hidden bg-[#012A3E] text-white">
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(1,42,62,0.55)_0%,rgba(1,42,62,0.88)_48%,rgba(1,42,62,0.97)_100%)]" />
          </div>

          <div className="relative flex flex-1 flex-col px-5 py-8 sm:px-14 sm:py-16">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Travelia"
                className="h-12 w-auto object-contain brightness-0 invert sm:h-16"
              />
            </div>

            <div className="mt-auto mb-auto max-w-lg pt-10 sm:pt-16">
              <p className="font-mono text-[11px] tracking-[0.28em] text-[#9aebed] uppercase">
                Travel journal
              </p>
              <h1 className="mt-4 font-display text-3xl leading-[1.05] font-semibold sm:text-5xl">
                {trip.title}
              </h1>
              {place ? (
                <p className="mt-4 text-lg text-white/85">{place}</p>
              ) : trip.destination?.title ? (
                <p className="mt-4 text-lg text-white/85">
                  {trip.destination.title}
                </p>
              ) : null}
              <p className="mt-3 font-mono text-sm tracking-wide text-white/70">
                {formatRange(trip.startDate, trip.endDate)}
              </p>
            </div>

            <div className="relative mt-10 border-t border-white/20 pt-6">
              <p className="font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase">
                A Travelia memory book · {pages.length} day
                {pages.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        {/* ——— DAY PAGES ——— */}
        {pages.map((day) => {
          const j = day.journal;
          const mood = j?.mood ? MOODS[j.mood] : null;
          const photos = j?.photos ?? [];
          const places = j?.places ?? [];

          return (
            <section
              key={day.id}
              className="trip-book-page break-before-page flex min-h-[297mm] flex-col bg-white px-5 py-8 sm:px-14 sm:py-14"
            >
              <header className="flex items-start justify-between gap-4 border-b border-[#012A3E]/15 pb-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-[#127E83] uppercase">
                    Day {day.dayNumber}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-[#012A3E] sm:text-3xl">
                    {formatLongDate(day.date)}
                  </h2>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo.png"
                  alt=""
                  className="h-8 w-auto object-contain opacity-80"
                />
              </header>

              <div className="mt-6 flex flex-wrap gap-2">
                {mood ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#012A3E] px-3 py-1 text-xs font-semibold text-white">
                    <span aria-hidden>{mood.emoji}</span>
                    {mood.label}
                  </span>
                ) : null}
                {j?.rating ? (
                  <span className="inline-flex items-center rounded-full bg-[#F4FAFB] px-3 py-1 text-xs font-semibold text-[#012A3E] ring-1 ring-[#e8eef0]">
                    {"★".repeat(j.rating)}
                    {"☆".repeat(5 - j.rating)} · {j.rating}/5
                  </span>
                ) : null}
              </div>

              {photos.length > 0 ? (
                <div
                  className={`mt-6 grid gap-2 ${
                    photos.length === 1
                      ? "grid-cols-1"
                      : photos.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2"
                  }`}
                >
                  {photos.slice(0, 6).map((url) => (
                    <div
                      key={url}
                      className="aspect-[4/3] overflow-hidden bg-[#eef3f4]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {j?.memory ? (
                <blockquote className="mt-8 border-l-4 border-[#127E83] pl-5">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-[#012A3E]">
                    {j.memory}
                  </p>
                </blockquote>
              ) : null}

              {places.length > 0 ? (
                <div className="mt-8">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-[#94A3B8] uppercase">
                    Places visited
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {places.map((placeItem) => (
                      <li
                        key={placeItem.id}
                        className="text-sm text-[#012A3E]"
                      >
                        · {placeItem.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!dayHasContent(day) ? (
                <p className="mt-10 text-sm text-[#94A3B8]">
                  No memories written for this day.
                </p>
              ) : null}

              <footer className="mt-auto flex items-center justify-between border-t border-[#012A3E]/10 pt-4 font-mono text-[10px] tracking-wide text-[#94A3B8] uppercase">
                <span>Travelia</span>
                <span>
                  {trip.title} · Day {day.dayNumber}
                </span>
              </footer>
            </section>
          );
        })}

        {/* ——— BACK PAGE ——— */}
        <section className="trip-book-page break-before-page flex min-h-[297mm] flex-col items-center justify-center bg-[#F4FAFB] px-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Travelia"
            className="h-16 w-auto object-contain"
          />
          <p className="mt-8 font-display text-2xl font-semibold text-[#012A3E]">
            Thanks for traveling with Travelia
          </p>
          <p className="mt-3 max-w-sm text-sm text-[#67717A]">
            Keep this book as a souvenir of {trip.title}. More journeys await.
          </p>
          <p className="mt-10 font-mono text-[10px] tracking-[0.2em] text-[#94A3B8] uppercase">
            travelia · memory book
          </p>
        </section>
      </div>
    </div>
  );
}

/** Compact export trigger used on the trip detail page */
export function TripBookExportButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25 ${className}`}
    >
      <Download className="h-3.5 w-3.5" />
      Export book
    </a>
  );
}
