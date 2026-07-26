"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Map as MapIcon,
  MapPinned,
  Megaphone,
  NotebookPen,
  Plane,
  ShieldCheck,
  Sparkles,
  Wallet,
  AlertTriangle,
  CloudSun,
  Clock3,
  Coins,
  Bell,
} from "lucide-react";
import type { TravelerDashboardData } from "@/lib/trips/dashboard";
import {
  FloatIcon,
  PackingBagSeal,
} from "@/components/traveler/motion/TravelMotion";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";
import { CountUp, Reveal, springSoft } from "./motion";

type Props = { data: TravelerDashboardData };

const STAGES = [
  "planning",
  "booked",
  "packing",
  "flying",
  "exploring",
  "completed",
] as const;

function formatRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

function countdownParts(days: number | null) {
  if (days == null) return { label: "Flexible", unit: "" };
  if (days < 0) return { label: "Underway", unit: "" };
  if (days === 0) return { label: "Today", unit: "" };
  if (days === 1) return { label: "1", unit: "day" };
  return { label: String(days), unit: "days" };
}

function WeatherChip({ city }: { city: string | null }) {
  const [label, setLabel] = useState("Fetching sky…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!city) {
        setLabel("Clear horizons");
        return;
      }
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        if (!geo.ok) throw new Error("geo");
        const gj = (await geo.json()) as {
          results?: Array<{ latitude: number; longitude: number }>;
        };
        const hit = gj.results?.[0];
        if (!hit) {
          setLabel("Local forecast soon");
          return;
        }
        const wx = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code`
        );
        if (!wx.ok) throw new Error("wx");
        const wj = (await wx.json()) as {
          current?: { temperature_2m?: number };
        };
        const temp = wj.current?.temperature_2m;
        if (cancelled) return;
        setLabel(
          typeof temp === "number" ? `${Math.round(temp)}° · ${city}` : city
        );
      } catch {
        if (!cancelled) setLabel(city || "Sky check offline");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
      <CloudSun className="h-3.5 w-3.5 text-[#9aebed]" />
      {label}
    </span>
  );
}

function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums">
      {now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function CurrencyWidget() {
  const [amount, setAmount] = useState("100");
  /** How many LBP for 1 USD */
  const [usdToLbp, setUsdToLbp] = useState<number | null>(null);
  const [direction, setDirection] = useState<"usd-lbp" | "lbp-usd">("usd-lbp");
  const [status, setStatus] = useState<"loading" | "ready" | "offline">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    async function loadRate() {
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json"
        );
        if (!res.ok) throw new Error("rate");
        const json = (await res.json()) as { usd?: { lbp?: number } };
        const next = json.usd?.lbp;
        if (!next || !Number.isFinite(next)) throw new Error("missing");
        if (!cancelled) {
          setUsdToLbp(next);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setUsdToLbp(89500);
          setStatus("offline");
        }
      }
    }
    void loadRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const n = Number(amount) || 0;
  const rate = usdToLbp ?? 89500;
  const converted =
    direction === "usd-lbp" ? n * rate : rate > 0 ? n / rate : 0;

  function formatLbp(value: number) {
    return new Intl.NumberFormat("en-LB", {
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  function formatUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">
          {direction === "usd-lbp" ? "$ → LBP" : "LBP → $"}
        </p>
        <button
          type="button"
          onClick={() =>
            setDirection((d) => (d === "usd-lbp" ? "lbp-usd" : "usd-lbp"))
          }
          className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-[#9aebed] transition hover:bg-white/15"
        >
          Swap
        </button>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-white/45">
          {direction === "usd-lbp" ? "$" : "ل.ل."}
        </span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="w-full rounded-xl border border-white/15 bg-white/10 py-2 pr-3 pl-9 text-sm text-white outline-none focus:border-[#34BDAF]"
          aria-label={
            direction === "usd-lbp"
              ? "Amount in US dollars"
              : "Amount in Lebanese pounds"
          }
          inputMode="decimal"
        />
      </div>
      <p className="font-display text-xl text-white">
        {status === "loading"
          ? "…"
          : direction === "usd-lbp"
            ? `${formatLbp(converted)} ل.ل.`
            : formatUsd(converted)}
      </p>
      <p className="text-[10px] leading-snug text-white/45">
        {status === "offline" ? "Approx. rate · " : "Live rate · "}
        1 USD ≈ {formatLbp(rate)} LBP
      </p>
    </div>
  );
}

function Ring({
  value,
  label,
  color = "#127E83",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.5rem] bg-white p-4 ring-1 ring-[#002642]/06">
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="rgba(0,38,66,0.08)"
            strokeWidth="8"
          />
          <motion.circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-display text-lg font-semibold text-[#002642]">
            <CountUp value={value} />%
          </p>
        </div>
      </div>
      <p className="text-xs font-medium text-[#67717A]">{label}</p>
    </div>
  );
}

export function DashboardOs({ data }: Props) {
  const formatMoney = useFormatMoney();
  const {
    firstName,
    stats,
    heroTrip,
    timelineTrips,
    journal,
    packing,
    wishlist,
    expensesByCategory,
    passport,
    visitedCountries,
    quote,
    announcements,
  } = data;

  const ads = useMemo(
    () => announcements.filter((a) => a.source === "broadcast"),
    [announcements]
  );
  const alertNotes = useMemo(
    () => announcements.filter((a) => a.source === "inbox" && !a.isRead),
    [announcements]
  );
  const [adIndex, setAdIndex] = useState(0);
  const activeAd = ads[adIndex] ?? ads[0] ?? null;

  useEffect(() => {
    if (ads.length < 2) return;
    const id = window.setInterval(() => {
      setAdIndex((i) => (i + 1) % ads.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [ads.length]);

  const [openTrip, setOpenTrip] = useState<string | null>(
    heroTrip?.id ?? timelineTrips[0]?.id ?? null
  );
  const [packLocal, setPackLocal] = useState(packing);
  const [pastHero, setPastHero] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroImage = heroTrip?.thumbnail || "/images/dest7.jpg";
  const count = countdownParts(heroTrip?.daysUntil ?? null);
  const stageIndex = heroTrip
    ? Math.max(0, STAGES.indexOf(heroTrip.stage))
    : 0;

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show widgets once the hero is mostly out of view (scrolled under it)
        setPastHero(!entry.isIntersecting || entry.intersectionRatio < 0.2);
      },
      { threshold: [0, 0.2, 0.5, 1], rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxExpense = Math.max(
    1,
    ...expensesByCategory.map((e) => e.amount),
    1
  );

  const essentialsMissing = useMemo(
    () =>
      packLocal.filter(
        (p) =>
          !p.completed &&
          /passport|charger|adapter|meds|medication|insurance/i.test(p.text)
      ),
    [packLocal]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Welcome back";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  function togglePack(id: string) {
    setPackLocal((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, completed: !p.completed } : p
      )
    );
  }

  const packDone = packLocal.filter((p) => p.completed).length;
  const packPct =
    packLocal.length > 0
      ? Math.round((packDone / packLocal.length) * 100)
      : 0;

  return (
    <div className="traveler-dashboard trips-list dash-os relative pb-24 text-[#002642]">
      {/* Ambient gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/4 h-[28rem] w-[28rem] rounded-full bg-[#51A5D6]/15 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[22rem] w-[22rem] rounded-full bg-[#34BDAF]/12 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[18rem] w-[18rem] rounded-full bg-[#127E83]/10 blur-3xl" />
      </div>

      {/* HERO */}
      <Reveal>
        <section
          ref={heroRef}
          className="relative isolate min-h-[min(72vh,560px)] overflow-hidden rounded-[1.25rem] sm:min-h-[min(88vh,720px)] sm:rounded-[2rem]"
        >          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#002642]/92 via-[#002642]/55 to-[#127E83]/35" />

          {/* Ambient flight trail */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[18%] hidden h-24 overflow-hidden sm:block"
          >
            <svg
              className="absolute inset-x-[8%] top-1/2 h-16 w-[84%] -translate-y-1/2 text-white/20"
              viewBox="0 0 640 64"
              fill="none"
            >
              <path
                d="M8 40 C 120 8, 220 56, 340 22 S 520 48, 632 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="5 9"
                className="travelia-flight-dash"
              />
            </svg>
            <FloatIcon className="absolute top-2 left-[12%] text-white/70" delay={0.2}>
              <Plane className="h-7 w-7 -rotate-12" strokeWidth={1.5} />
            </FloatIcon>
            <FloatIcon
              className="absolute right-[18%] bottom-0 text-[#9aebed]/80"
              delay={1.1}
            >
              <MapPinned className="h-5 w-5" strokeWidth={1.75} />
            </FloatIcon>
          </div>

          <div className="relative flex min-h-[min(72vh,560px)] flex-col justify-between p-4 sm:min-h-[min(88vh,720px)] sm:p-10 lg:p-12">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl"
              >
                Travelia
              </motion.p>
              <div className="flex flex-wrap gap-2">
                <WeatherChip city={heroTrip?.city ?? null} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34BDAF]" />
                  {passport.isVerified
                    ? "Passport verified"
                    : passport.status === "pending"
                      ? "Passport under review"
                      : "Passport needed"}
                </span>
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-[0.22em] text-[#9aebed] uppercase">
                {greeting}, {firstName}
              </p>
              <h1 className="mt-3 font-display text-[1.85rem] leading-[1.08] font-semibold text-white sm:text-5xl sm:leading-[1.05] lg:text-6xl">
                {heroTrip
                  ? heroTrip.stage === "exploring"
                    ? `Living ${heroTrip.title}`
                    : `Next: ${heroTrip.title}`
                  : "Your next chapter awaits"}
              </h1>
              <p className="mt-4 max-w-lg text-base text-white/75 sm:text-lg">
                {heroTrip
                  ? `${formatRange(heroTrip.startDate, heroTrip.endDate)}${
                      heroTrip.place ? ` · ${heroTrip.place}` : ""
                    }`
                  : "Plan, pack, and depart — your travel operating system starts here."}
              </p>

              <div className="mt-8 flex flex-wrap items-end gap-6">
                <div className="rounded-[1.5rem] bg-white/10 px-5 py-4 backdrop-blur-md ring-1 ring-white/15">
                  <p className="text-[11px] tracking-wide text-white/60 uppercase">
                    Countdown
                  </p>
                  <p className="mt-1 font-display text-4xl font-semibold text-white">
                    {count.label}
                    {count.unit ? (
                      <span className="ml-2 text-lg font-medium text-white/70">
                        {count.unit}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-white/10 px-5 py-4 backdrop-blur-md ring-1 ring-white/15">
                  <p className="text-[11px] tracking-wide text-white/60 uppercase">
                    Journey status
                  </p>
                  <p className="mt-1 text-lg font-semibold capitalize text-white">
                    {heroTrip?.stage?.replace("-", " ") || "Ready to explore"}
                  </p>
                  <p className="text-xs text-white/60">
                    {heroTrip
                      ? "On-time for your travel window"
                      : "No active departure"}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {heroTrip ? (
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={`/dashboard/trips/${heroTrip.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-[#002642] shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                    >
                      Continue journey
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </motion.div>
                ) : (
                  <Link
                    href="/destinations"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#34BDAF] px-6 py-3.5 text-sm font-semibold text-[#002642]"
                  >
                    Explore destinations
                    <Compass className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md"
                >
                  View bookings
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* QUICK ACTIONS — floating orbs */}
      <Reveal delay={0.08} className="mt-10">
        <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
          {(
            [
              {
                href: "/destinations",
                label: "Book trip",
                icon: Plane,
                color: "from-[#127E83] to-[#34BDAF]",
              },
              {
                href: heroTrip
                  ? `/dashboard/trips/${heroTrip.id}`
                  : "/dashboard/trips",
                label: "Itinerary",
                icon: NotebookPen,
                color: "from-[#002642] to-[#127E83]",
              },
              {
                href: "/destinations",
                label: "Explore",
                icon: Compass,
                color: "from-[#51A5D6] to-[#127E83]",
              },
              {
                href: heroTrip
                  ? `/dashboard/trips/${heroTrip.id}`
                  : "/dashboard/gallery",
                label: "Journal",
                icon: BookOpen,
                color: "from-[#34BDAF] to-[#51A5D6]",
              },
              {
                href: heroTrip
                  ? `/dashboard/trips/${heroTrip.id}`
                  : "/dashboard/trips",
                label: "Budget",
                icon: Wallet,
                color: "from-[#002642] to-[#51A5D6]",
              },
            ] as const
          ).map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6 }}
              className="flex flex-col items-center gap-2"
            >
              <FloatIcon delay={i * 0.25}>
                <Link
                  href={action.href}
                  className={`group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${action.color} text-white shadow-[0_16px_40px_rgba(0,38,66,0.2)] transition sm:h-[4.5rem] sm:w-[4.5rem]`}
                >
                  <action.icon className="h-6 w-6 transition group-hover:scale-110" />
                </Link>
              </FloatIcon>
              <span className="text-xs font-semibold text-[#002642]/80">
                {action.label}
              </span>
            </motion.div>
          ))}
        </div>
      </Reveal>

      {/* STAGE PATH */}
      <Reveal delay={0.1} className="mt-14">
        <div className="dash-stages rounded-[2rem] bg-white/80 p-6 ring-1 ring-[#002642]/06 backdrop-blur-sm sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
            Trip progress
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#002642]">
            Journey stages
          </h2>
          <div className="relative mt-10">
            <div className="dash-stages__track absolute top-5 right-4 left-4 h-[3px] rounded-full bg-[#d1e8ea] sm:left-8 sm:right-8" />
            <motion.div
              className="absolute top-5 left-4 h-[3px] rounded-full bg-gradient-to-r from-[#127E83] to-[#34BDAF] sm:left-8"
              initial={{ width: 0 }}
              whileInView={{
                width: `calc(${(stageIndex / (STAGES.length - 1)) * 100}% - 2rem)`,
              }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              aria-hidden
              className="absolute top-2 text-[#127E83]"
              initial={{ left: "0.5rem", opacity: 0 }}
              whileInView={{
                left: `calc(${(stageIndex / (STAGES.length - 1)) * 100}% - 1.25rem)`,
                opacity: 1,
              }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            >
              <Plane className="h-5 w-5 -rotate-12" strokeWidth={2} />
            </motion.div>
            <div className="relative grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-4">
              {STAGES.map((stage, i) => {
                const active = i <= stageIndex;
                const current = active && i === stageIndex;
                return (
                  <div key={stage} className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
                    <motion.span
                      className={`dash-stages__dot flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold sm:h-10 sm:w-10 sm:text-xs ${
                        current
                          ? "bg-[#127E83] text-white shadow-[0_8px_20px_rgba(18,126,131,0.35)] ring-4 ring-[#127E83]/25"
                          : active
                            ? "bg-[#012A3E] text-white"
                            : "bg-white text-[#67717A] ring-2 ring-[#d1e8ea]"
                      }`}
                      whileHover={{ scale: 1.08 }}
                      initial={{ scale: 0.7, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        ...springSoft,
                        delay: i * 0.05,
                      }}
                    >
                      {current ? (
                        <Plane className="h-4 w-4 -rotate-45" />
                      ) : (
                        i + 1
                      )}
                    </motion.span>
                    <span
                      className={`dash-stages__label w-full truncate text-center text-[10px] font-semibold capitalize sm:text-[11px] ${
                        active ? "text-[#012A3E]" : "text-[#67717A]"
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>

      {/* TIMELINE + STATS */}
      <div className="mt-14 grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
            Travel timeline
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold">
            Your journey log
          </h2>
          <div className="relative mt-8 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[1.15rem] before:w-px before:bg-gradient-to-b before:from-[#127E83] before:to-transparent">
            {timelineTrips.length === 0 ? (
              <p className="pl-12 text-sm text-[#67717A]">
                No trips yet — book a destination and your timeline blooms here.
              </p>
            ) : (
              timelineTrips.map((trip) => {
                const open = openTrip === trip.id;
                return (
                  <motion.article
                    key={trip.id}
                    layout
                    className="relative pl-12"
                  >
                    <span className="absolute top-6 left-3 h-3 w-3 rounded-full bg-[#34BDAF] ring-4 ring-white" />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenTrip(open ? null : trip.id)
                      }
                      className="group w-full overflow-hidden rounded-[1.75rem] bg-white text-left ring-1 ring-[#002642]/06 transition hover:ring-[#127E83]/30"
                    >
                      <div className="flex gap-0 sm:gap-4">
                        <div className="relative hidden h-36 w-40 shrink-0 overflow-hidden sm:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={trip.thumbnail || "/images/dest2.jpg"}
                            alt=""
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:pr-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#002642]/6 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#002642] uppercase">
                              {trip.stage}
                            </span>
                            <span className="text-xs text-[#67717A]">
                              {formatRange(trip.startDate, trip.endDate)}
                            </span>
                          </div>
                          <h3 className="mt-1 truncate font-display text-2xl font-semibold">
                            {trip.title}
                          </h3>
                          <p className="mt-1 text-sm text-[#67717A]">
                            {trip.place || "Open destination"}
                          </p>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef3f4]">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#127E83] to-[#34BDAF]"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${trip.progress}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.9 }}
                            />
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {open ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-[#eef3f4] bg-[#F8FBFC] px-5 py-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm text-[#67717A]">
                                Budget left {formatMoney(trip.remaining)} ·{" "}
                                {trip.progress}% along the path
                              </p>
                              <Link
                                href={`/dashboard/trips/${trip.id}`}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[#127E83]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open trip <ArrowRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </button>
                  </motion.article>
                );
              })
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#51A5D6] uppercase">
            Travel statistics
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold">
            Atlas pulse
          </h2>

          <div className="mt-8 space-y-5">
            <div className="rounded-[1.75rem] bg-[#002642] p-6 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/65">Explorer level</p>
                <Sparkles className="h-4 w-4 text-[#34BDAF]" />
              </div>
              <p className="mt-2 font-display text-5xl font-semibold">
                <CountUp value={stats.explorerLevel} />
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#34BDAF] to-[#51A5D6]"
                  initial={{ width: 0 }}
                  whileInView={{
                    width: `${(stats.adventureScore % 20) * 5 || stats.adventureScore}%`,
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p className="mt-2 text-xs text-white/55">
                Adventure score {stats.adventureScore}/100 · streak{" "}
                {stats.travelStreak} mo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Ring value={Math.min(100, stats.countries * 12)} label="Countries" color="#127E83" />
              <Ring value={stats.packingProgress} label="Packing" color="#34BDAF" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cities", value: stats.cities, icon: MapPinned },
                { label: "Completed", value: stats.completedTrips, icon: Plane },
                { label: "Visited pins", value: stats.visitedPlaces, icon: MapIcon },
                { label: "Open bookings", value: stats.openBookings, icon: NotebookPen },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-[1.5rem] bg-white p-4 ring-1 ring-[#002642]/06"
                >
                  <s.icon className="h-4 w-4 text-[#127E83]" />
                  <p className="mt-3 font-display text-3xl font-semibold">
                    <CountUp value={s.value} />
                  </p>
                  <p className="text-xs text-[#67717A]">{s.label}</p>
                </div>
              ))}
            </div>

            {visitedCountries.length > 0 ? (
              <div className="rounded-[1.5rem] bg-[#F4FAFB] p-4">
                <p className="text-xs font-semibold text-[#67717A]">
                  Countries unlocked
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visitedCountries.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#002642] ring-1 ring-[#e8eef0]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>

      {/* JOURNAL */}
      <Reveal className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
              Travel journal
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold">
              Recent memories
            </h2>
          </div>
          <Link
            href="/dashboard/gallery"
            className="text-sm font-semibold text-[#127E83] hover:underline"
          >
            Gallery
          </Link>
        </div>
        {journal.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-[#d1e8ea] px-6 py-14 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-[#94A3B8]" />
            <p className="mt-3 font-medium">Your notebook is blank</p>
            <p className="mt-1 text-sm text-[#67717A]">
              Add photos and notes inside a trip’s travel journal.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {journal.slice(0, 3).map((entry, i) => (
              <motion.div
                key={entry.id}
                whileHover={{ y: -4 }}
                transition={springSoft}
                className="dash-journal-card overflow-hidden rounded-[1.75rem] bg-[#fffdf8] shadow-[0_20px_50px_rgba(0,38,66,0.06)] ring-1 ring-[#eadfce]"
                style={{ rotate: i % 2 === 0 ? -0.6 : 0.6 }}
              >
                {entry.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.photos[0]}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="dash-journal-card__ph flex h-40 items-center justify-center bg-[#f3ebe0] text-[#a8927a]">
                    <NotebookPen className="h-8 w-8" />
                  </div>
                )}
                <div className="p-5">
                  <p className="dash-journal-card__meta text-[11px] font-semibold tracking-wide text-[#8a735c] uppercase">
                    {entry.dayKey} · {entry.tripTitle}
                  </p>
                  <p className="dash-journal-card__body mt-2 line-clamp-3 text-sm leading-relaxed text-[#002642]">
                    {entry.memory ||
                      entry.place ||
                      "A quiet page from the road."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#67717A]">
                    {entry.mood ? (
                      <span className="dash-journal-card__chip rounded-full bg-[#f3ebe0] px-2.5 py-1 capitalize text-[#5c4a38]">
                        {entry.mood}
                      </span>
                    ) : null}
                    {entry.place ? (
                      <span className="dash-journal-card__chip dash-journal-card__chip--place rounded-full bg-[#eef6f6] px-2.5 py-1 text-[#127E83]">
                        {entry.place}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/trips/${entry.tripId}`}
                    className="dash-journal-card__link mt-4 inline-flex text-xs font-semibold text-[#127E83]"
                  >
                    Expand entry →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Reveal>

      {/* BUDGET + PACKING */}
      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-[2rem] bg-white p-6 ring-1 ring-[#002642]/06 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
                  Budget
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold">
                  Spend pulse
                </h2>
              </div>
              <Wallet className="h-5 w-5 text-[#34BDAF]" />
            </div>
            <p className="mt-6 font-display text-4xl font-semibold">
              {formatMoney(Math.max(0, stats.totalBudget - stats.totalSpent))}
            </p>
            <p className="text-sm text-[#67717A]">
              remaining of {formatMoney(stats.totalBudget)} planned
            </p>
            <div className="mt-6 space-y-3">
              {expensesByCategory.length === 0 ? (
                <p className="text-sm text-[#67717A]">
                  Log expenses inside a trip to see category flow.
                </p>
              ) : (
                expensesByCategory.slice(0, 5).map((slice) => (
                  <div key={slice.category}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold capitalize">
                        {slice.category}
                      </span>
                      <span className="text-[#67717A]">
                        {formatMoney(slice.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef3f4]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#002642] to-[#51A5D6]"
                        initial={{ width: 0 }}
                        whileInView={{
                          width: `${(slice.amount / maxExpense) * 100}%`,
                        }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-6 text-xs text-[#67717A]">
              Daily average on active trips ·{" "}
              {formatMoney(
                stats.totalSpent /
                  Math.max(1, stats.completedTrips + stats.ongoingTrips)
              )}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="h-full rounded-[2rem] bg-white p-6 ring-1 ring-[#002642]/06 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
                  Packing
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold">
                  Checklist
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <PackingBagSeal progress={packPct} />
                <p className="font-display text-2xl font-semibold text-[#127E83]">
                  {packPct}%
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef3f4]">
              <motion.div
                className="h-full bg-[#34BDAF]"
                animate={{ width: `${packPct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            {packPct >= 100 && packLocal.length > 0 ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-xs font-semibold text-[#127E83]"
              >
                Bag sealed — you&apos;re ready to fly
              </motion.p>
            ) : essentialsMissing.length > 0 ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#E4574A]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {essentialsMissing.length} essential
                {essentialsMissing.length > 1 ? "s" : ""} still open
              </p>
            ) : null}
            <ul className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
              {packLocal.length === 0 ? (
                <li className="text-sm text-[#67717A]">
                  Open a trip to build packing lists.
                </li>
              ) : (
                packLocal.map((item, idx) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() => togglePack(item.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#F4FAFB]"
                    >
                      <motion.span
                        layout
                        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                          item.completed
                            ? "bg-[#34BDAF] text-white"
                            : "bg-[#eef3f4] text-transparent"
                        }`}
                        animate={
                          item.completed
                            ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                            : { scale: 1, rotate: 0 }
                        }
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            item.completed
                              ? "text-[#94A3B8] line-through"
                              : "text-[#002642]"
                          }`}
                        >
                          {item.text}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">
                          {item.checklistTitle}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                ))
              )}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* WISHLIST */}
      <Reveal className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
              Wishlist
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold">
              Places on your mind
            </h2>
          </div>
          <Link
            href="/dashboard/favorites"
            className="text-sm font-semibold text-[#127E83] hover:underline"
          >
            All favorites
          </Link>
        </div>
        {wishlist.length === 0 ? (
          <Link
            href="/destinations"
            className="mt-6 flex min-h-[200px] items-end rounded-[2rem] bg-[#002642] p-6 text-white"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent, rgba(0,38,66,0.85)), url(/images/dest3.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div>
              <p className="font-display text-2xl font-semibold">
                Start a wishlist
              </p>
              <p className="mt-1 text-sm text-white/70">
                Heart destinations while you browse.
              </p>
            </div>
          </Link>
        ) : (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {wishlist.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -8 }}
                className="relative h-[240px] w-[min(78vw,220px)] shrink-0 overflow-hidden rounded-[1.5rem] sm:h-[300px] sm:w-[240px] sm:rounded-[1.75rem]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail || "/images/dest4.jpg"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#002642] via-[#002642]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="font-display text-2xl font-semibold">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {[item.city, item.country].filter(Boolean).join(", ")}
                  </p>
                  <Link
                    href={
                      item.slug
                        ? `/destinations/${item.slug}`
                        : "/destinations"
                    }
                    className="mt-3 inline-flex rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md"
                  >
                    Quick add / view
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Reveal>

      {/* Announcements + ads (read-only) */}
      <Reveal className="mt-16 max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#127E83] uppercase">
              From Travelia
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold">
              Announcements
            </h2>
            <p className="mt-1 text-sm text-[#67717A]">
              Travel notes and featured spots — just for browsing.
            </p>
          </div>
        </div>

        {alertNotes.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {alertNotes.slice(0, 3).map((note) => (
              <li
                key={note.id}
                className="flex items-start gap-3 rounded-2xl bg-[#FFF5F4] px-4 py-3 ring-1 ring-[#E4574A]/20"
              >
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#E4574A]" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-wide text-[#E4574A] uppercase">
                    Notice
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-[#002642]">
                    {note.title}
                  </span>
                  <span className="mt-0.5 line-clamp-3 block text-xs text-[#67717A]">
                    {note.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {activeAd ? (
          <article className="relative mt-5 overflow-hidden rounded-[1.75rem] ring-1 ring-[#002642]/08">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/dest${(adIndex % 5) + 2}.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#002642] via-[#002642]/78 to-[#002642]/40" />
            <div className="relative flex min-h-[240px] flex-col justify-between p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-md">
                    <Megaphone className="h-3 w-3 text-[#9aebed]" />
                    Announcement
                  </span>
                  <span className="rounded-full bg-[#34BDAF]/25 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#9aebed] uppercase backdrop-blur-md">
                    Featured
                  </span>
                </div>
                {ads.length > 1 ? (
                  <div className="flex gap-1">
                    {ads.map((ad, i) => (
                      <button
                        key={ad.id}
                        type="button"
                        aria-label={`Announcement ${i + 1}`}
                        onClick={() => setAdIndex(i)}
                        className={`h-1.5 rounded-full transition ${
                          i === adIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAd.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="mt-8"
                >
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9aebed] uppercase">
                    Board notice
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
                    {activeAd.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                    {activeAd.message}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </article>
        ) : alertNotes.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-[#d1e8ea] px-5 py-10 text-center text-sm text-[#67717A]">
            No announcements right now — check back soon.
          </div>
        ) : null}
      </Reveal>

      {/* FOOTER QUOTE */}
      <Reveal className="mt-16">
        <section className="relative isolate overflow-hidden rounded-[2rem] min-h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/dest5.jpg"
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
          <div className="absolute inset-0 bg-[#002642]/75" />
          <div className="relative flex min-h-[260px] flex-col items-center justify-center px-6 py-16 text-center text-white">
            <p className="max-w-2xl font-display text-2xl leading-snug font-semibold sm:text-3xl">
              “{quote.text}”
            </p>
            <p className="mt-4 text-sm tracking-wide text-white/65">
              — {quote.author}
            </p>
          </div>
        </section>
      </Reveal>

      {/* Local time + USD ↔ LBP — appear after scrolling past hero */}
      <AnimatePresence>
        {pastHero ? (
          <motion.aside
            key="travel-widgets"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed right-3 bottom-3 z-40 flex w-[min(220px,calc(100vw-1.5rem))] flex-col gap-3 sm:right-4 sm:bottom-4"
          >
            <div className="pointer-events-auto rounded-2xl bg-[#002642]/92 p-4 text-white shadow-[0_16px_40px_rgba(0,38,66,0.35)] ring-1 ring-white/10 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/55 uppercase">
                <Clock3 className="h-3.5 w-3.5 text-[#9aebed]" />
                Local time
              </div>
              <p className="font-display text-2xl font-semibold">
                <LocalClock />
              </p>
              <p className="mt-1 text-[10px] text-white/45">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="pointer-events-auto rounded-2xl bg-[#002642]/92 p-4 text-white shadow-[0_16px_40px_rgba(0,38,66,0.35)] ring-1 ring-white/10 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/55 uppercase">
                <Coins className="h-3.5 w-3.5 text-[#34BDAF]" />
                Converter
              </div>
              <CurrencyWidget />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
