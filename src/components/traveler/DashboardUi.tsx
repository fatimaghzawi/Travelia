"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Images,
  MapPinned,
  Megaphone,
  Ticket,
} from "lucide-react";
import type {
  DashboardAnnouncement,
  DashboardCalendarEvent,
  DashboardStats,
  DashboardTrip,
} from "@/lib/trips/dashboard";
import { TravelCalendar } from "@/components/traveler/TravelCalendar";

type DashboardUiProps = {
  firstName: string;
  stats: DashboardStats;
  upcomingTrips: DashboardTrip[];
  announcements: DashboardAnnouncement[];
  calendarEvents: DashboardCalendarEvent[];
};

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const a = new Date(start);
  const b = new Date(end);
  const same =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same) {
    return a.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  }
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

function countdownLabel(trip: DashboardTrip) {
  if (trip.status === "ongoing") return "Happening now";
  if (trip.daysUntil == null) return null;
  if (trip.daysUntil === 0) return "Departs today";
  if (trip.daysUntil === 1) return "Tomorrow";
  return `In ${trip.daysUntil} days`;
}

export function DashboardUi({
  firstName,
  stats,
  upcomingTrips,
  announcements,
  calendarEvents,
}: DashboardUiProps) {
  const hero = upcomingTrips[0] ?? null;
  const heroImage = hero?.thumbnail || "/images/dest7.jpg";
  const eta = hero ? countdownLabel(hero) : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="traveler-dashboard trips-list dash-home">
      {/* Full-bleed journey hero */}
      <section className="dash-rise relative isolate min-h-[min(72vh,560px)] overflow-hidden rounded-[1.75rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="dash-ken absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(1,42,62,0.92) 0%, rgba(1,42,62,0.72) 42%, rgba(18,126,131,0.35) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex min-h-[min(72vh,560px)] flex-col justify-between p-6 sm:p-9 lg:p-11">
          <div className="flex items-start justify-between gap-4">
            <p className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Travelia
            </p>
            <p className="max-w-[10rem] text-right text-[11px] leading-snug font-medium tracking-wide text-white/70 sm:max-w-none sm:text-xs">
              {todayLabel}
            </p>
          </div>

          <div className="max-w-xl">
            <p className="dash-rise dash-delay-1 text-sm font-medium tracking-[0.2em] text-[#9aebed] uppercase">
              {greeting}, {firstName}
            </p>
            <h1 className="dash-rise dash-delay-2 mt-3 font-display text-3xl leading-[1.1] font-semibold text-white sm:text-4xl lg:text-5xl">
              {hero
                ? hero.status === "ongoing"
                  ? `You’re in ${hero.title}`
                  : `Next stop: ${hero.title}`
                : "Where will you go next?"}
            </h1>
            <p className="dash-rise dash-delay-3 mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
              {hero
                ? [
                    eta,
                    hero.place,
                    formatRange(hero.startDate, hero.endDate),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Browse destinations, book a journey, and your atlas fills in here."}
            </p>

            <div className="dash-rise dash-delay-4 mt-7 flex flex-wrap gap-3">
              {hero ? (
                <Link
                  href={`/dashboard/trips/${hero.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#012A3E] transition hover:bg-[#9aebed]"
                >
                  Open trip
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/destinations"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#127E83] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f6d71]"
                >
                  Explore destinations
                  <Compass className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/dashboard/bookings"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Bookings
              </Link>
            </div>
          </div>

          {/* Soft metric ribbon — not KPI cards */}
          <div className="dash-rise dash-delay-5 mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-white">
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {stats.ongoingTrips}
              </p>
              <p className="text-[11px] tracking-wide text-white/65 uppercase">
                On the road
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {stats.upcomingTrips}
              </p>
              <p className="text-[11px] tracking-wide text-white/65 uppercase">
                Upcoming
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {stats.openBookings}
              </p>
              <p className="text-[11px] tracking-wide text-white/65 uppercase">
                Bookings
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {stats.visitedPlaces}
              </p>
              <p className="text-[11px] tracking-wide text-white/65 uppercase">
                Visited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Horizon — cinematic trip strip */}
      <section className="dash-rise dash-delay-3 mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#127E83] uppercase">
              Horizon
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#012A3E]">
              Your next chapters
            </h2>
          </div>
          <Link
            href="/dashboard/trips"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#127E83] hover:underline"
          >
            All trips
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {upcomingTrips.length === 0 ? (
          <Link
            href="/destinations"
            className="mt-5 flex min-h-[220px] items-end overflow-hidden rounded-[1.5rem] bg-[#012A3E] p-6 transition hover:opacity-95"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent 20%, rgba(1,42,62,0.85)), url(/images/dest3.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="text-white">
              <p className="font-display text-2xl font-semibold">
                The map is waiting
              </p>
              <p className="mt-1 text-sm text-white/75">
                Pick a destination and your first chapter appears here.
              </p>
            </div>
          </Link>
        ) : (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {upcomingTrips.map((trip, index) => {
              const thumb = trip.thumbnail || `/images/dest${(index % 6) + 2}.jpg`;
              const label = countdownLabel(trip);
              return (
                <Link
                  key={trip.id}
                  href={`/dashboard/trips/${trip.id}`}
                  className="group relative h-[280px] w-[min(78vw,300px)] shrink-0 overflow-hidden rounded-[1.5rem] sm:h-[320px] sm:w-[280px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#012A3E] via-[#012A3E]/45 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    {label ? (
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9aebed] uppercase">
                        {label}
                      </p>
                    ) : null}
                    <p className="mt-1 font-display text-2xl font-semibold leading-tight">
                      {trip.title}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {formatRange(trip.startDate, trip.endDate)}
                        {trip.place ? ` · ${trip.place}` : ""}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/destinations"
              className="flex h-[280px] w-[min(60vw,200px)] shrink-0 flex-col justify-between rounded-[1.5rem] bg-[#F4FAFB] p-5 ring-1 ring-[#d1e8ea] transition hover:bg-white sm:h-[320px]"
            >
              <Compass className="h-7 w-7 text-[#127E83]" />
              <div>
                <p className="font-display text-xl font-semibold text-[#012A3E]">
                  Add a chapter
                </p>
                <p className="mt-1 text-sm text-[#67717A]">
                  Explore new destinations
                </p>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* Atlas + signal */}
      <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="dash-rise">
          <div className="mb-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#127E83] uppercase">
              Atlas
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#012A3E]">
              When you travel
            </h2>
            <p className="mt-1 text-sm text-[#67717A]">
              Tap a bar to focus a journey across the calendar.
            </p>
          </div>
          <TravelCalendar events={calendarEvents} />
        </div>

        <div className="dash-rise dash-delay-2 flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#E4574A] uppercase">
              Signal
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#012A3E]">
              From Travelia
            </h2>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] bg-[#012A3E] text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="h-4 w-4 text-[#9aebed]" />
                Announcements
              </span>
              <Link
                href="/dashboard/notifications"
                className="text-xs font-semibold text-[#9aebed] hover:underline"
              >
                Inbox
              </Link>
            </div>
            {announcements.length === 0 ? (
              <p className="px-5 py-10 text-sm text-white/65">
                Quiet skies for now — new notes land here and in your email.
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {announcements.slice(0, 4).map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold">{item.title}</p>
                      {!item.isRead ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E4574A]" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/70">
                      {item.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  href: "/destinations",
                  label: "Destinations",
                  sub: "Find your next place",
                  icon: Compass,
                },
                {
                  href: "/dashboard/bookings",
                  label: "Bookings",
                  sub: "Tickets & journeys",
                  icon: Ticket,
                },
                {
                  href: "/dashboard/visited",
                  label: "Visited",
                  sub: "Your world map",
                  icon: MapPinned,
                },
                {
                  href: "/dashboard/gallery",
                  label: "Gallery",
                  sub: "Frame & share",
                  icon: Images,
                },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.25rem] bg-[#F4FAFB] p-4 transition hover:bg-[#012A3E] hover:text-white"
              >
                <item.icon className="h-5 w-5 text-[#127E83] transition group-hover:text-[#9aebed]" />
                <p className="mt-4 text-sm font-semibold text-[#012A3E] group-hover:text-white">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-[#67717A] group-hover:text-white/65">
                  {item.sub}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
