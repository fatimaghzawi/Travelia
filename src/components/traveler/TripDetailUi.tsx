"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Coffee,
  Compass,
  Flag,
  Hotel,
  Loader2,
  MapPin,
  Plane,
  Plus,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
  Utensils,
} from "lucide-react";
import type { TripDayData } from "@/components/traveler/trip-day-types";
import { TripTravelJournal } from "@/components/traveler/TripTravelJournal";
import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";
import {
  TripReviewPanel,
  type TripReviewData,
} from "@/components/traveler/TripReviewPanel";

type TripInfo = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  estimatedCost: number;
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
};

type ChecklistData = {
  id: string;
  title: string;
  items: { id: string; text: string; completed: boolean }[];
};

type ExpenseData = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  notes: string | null;
};

const CATEGORIES = [
  "hotel",
  "food",
  "transport",
  "shopping",
  "activities",
  "flight",
  "other",
] as const;

const CATEGORY_META: Record<
  string,
  { label: string; icon: typeof Coffee; tint: string; chip: string; bar: string }
> = {
  hotel: {
    label: "Stay",
    icon: Hotel,
    tint: "bg-[#E8F4F5] text-[#127E83]",
    chip: "bg-[#127E83]/12 text-[#0f6d71] ring-[#127E83]/25",
    bar: "bg-[#127E83]",
  },
  food: {
    label: "Food",
    icon: Utensils,
    tint: "bg-[#FFF1EC] text-[#E4574A]",
    chip: "bg-[#E4574A]/12 text-[#c9443a] ring-[#E4574A]/25",
    bar: "bg-[#E4574A]",
  },
  transport: {
    label: "Ride",
    icon: Compass,
    tint: "bg-[#EEF3F8] text-[#3B6B8C]",
    chip: "bg-[#3B6B8C]/12 text-[#2f5670] ring-[#3B6B8C]/25",
    bar: "bg-[#3B6B8C]",
  },
  shopping: {
    label: "Shop",
    icon: ShoppingBag,
    tint: "bg-[#F3EEF8] text-[#6B5B95]",
    chip: "bg-[#6B5B95]/12 text-[#56487a] ring-[#6B5B95]/25",
    bar: "bg-[#6B5B95]",
  },
  activities: {
    label: "Fun",
    icon: Ticket,
    tint: "bg-[#FFF8E8] text-[#C48A1A]",
    chip: "bg-[#C48A1A]/12 text-[#9a6c12] ring-[#C48A1A]/25",
    bar: "bg-[#C48A1A]",
  },
  flight: {
    label: "Flight",
    icon: Plane,
    tint: "bg-[#EAF2FF] text-[#3B6FBF]",
    chip: "bg-[#3B6FBF]/12 text-[#2f5899] ring-[#3B6FBF]/25",
    bar: "bg-[#3B6FBF]",
  },
  other: {
    label: "Other",
    icon: Sparkles,
    tint: "bg-[#F4FAFB] text-[#67717A]",
    chip: "bg-[#67717A]/10 text-[#4f575f] ring-[#67717A]/20",
    bar: "bg-[#67717A]",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TripDetailUi({
  trip,
  checklists,
  expenses,
  bookings,
  journalDays,
  existingReview = null,
}: {
  trip: TripInfo;
  checklists: ChecklistData[];
  expenses: ExpenseData[];
  bookings: { id: string; label: string; price: number }[];
  journalDays: TripDayData[];
  existingReview?: TripReviewData | null;
}) {
  const router = useRouter();
  const formatMoney = useFormatMoney();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"journal" | "checklist" | "budget">("journal");

  const [budget, setBudget] = useState(
    String(trip.totalBudget > 0 ? trip.totalBudget : 0)
  );
  const [newItem, setNewItem] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "food",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);

  const primaryChecklist = checklists[0] ?? null;
  const thumb =
    trip.destination?.thumbnail || trip.coverImage || "/images/dest3.jpg";
  const readOnly = trip.status === "cancelled";
  const spentTotal = expenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );
  const budgetValue = Number(budget);
  const activeBudget =
    Number.isFinite(budgetValue) && budgetValue >= 0
      ? budgetValue
      : trip.totalBudget;
  const remainingTotal = Math.max(0, activeBudget - spentTotal);

  const checklistItems = primaryChecklist?.items ?? [];
  const doneCount = checklistItems.filter((i) => i.completed).length;
  const checklistPct =
    checklistItems.length === 0
      ? 0
      : Math.round((doneCount / checklistItems.length) * 100);
  const spendPct =
    activeBudget <= 0
      ? spentTotal > 0
        ? 100
        : 0
      : Math.min(100, Math.round((spentTotal / activeBudget) * 100));

  const questCopy = useMemo(() => {
    if (checklistItems.length === 0) return "Plot your first quest";
    if (checklistPct === 100) return "All quests stamped — ready to go";
    if (checklistPct >= 60) return "Trail almost complete";
    if (doneCount > 0) return "Keep climbing the trail";
    return "Tap a circle to stamp it done";
  }, [checklistItems.length, checklistPct, doneCount]);

  const walletMood = useMemo(() => {
    if (activeBudget <= 0) return "Set a budget to light up the meter";
    if (spendPct >= 90) return "Near the ceiling — spend with care";
    if (spendPct >= 60) return "Healthy mid-trip rhythm";
    if (spentTotal > 0) return "Lots of runway still open";
    return "Wallet ready — log your first treat";
  }, [activeBudget, spendPct, spentTotal]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function markCompleted() {
    if (readOnly || trip.status === "completed") return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not complete trip");
      }
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete trip");
    } finally {
      setPending(false);
    }
  }

  async function toggleItem(
    checklistId: string,
    itemId: string,
    completed: boolean
  ) {
    if (readOnly || !itemId) return;
    setError(null);
    try {
      const res = await fetch(`/api/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Update failed");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function addChecklistItem() {
    if (!newItem.trim() || readOnly || addingChecklist) return;
    setAddingChecklist(true);
    setError(null);
    const text = newItem.trim();
    try {
      if (!primaryChecklist) {
        const res = await fetch(`/api/trips/${trip.id}/checklists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Travel checklist",
            items: [{ text, completed: false }],
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success)
          throw new Error(json.message || "Could not create checklist");
      } else {
        const res = await fetch(`/api/checklists/${primaryChecklist.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addItem: text }),
        });
        const json = await res.json();
        if (!res.ok || !json.success)
          throw new Error(json.message || "Could not add item");
      }
      setNewItem("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add item");
    } finally {
      setAddingChecklist(false);
    }
  }

  async function removeChecklistItem(checklistId: string, itemId: string) {
    if (readOnly || !itemId) return;
    setError(null);
    try {
      const res = await fetch(`/api/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeItemId: itemId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Could not remove item");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove item");
    }
  }

  async function saveBudget() {
    if (readOnly) return;
    const value = Number(budget);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid budget");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalBudget: value }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Could not save budget");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save budget");
    } finally {
      setPending(false);
    }
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    if (readOnly || addingExpense) return;
    const amount = Number(expenseForm.amount);
    if (!expenseForm.title.trim() || !Number.isFinite(amount) || amount < 0) {
      setError("Add a title and amount");
      return;
    }
    setAddingExpense(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseForm.title.trim(),
          amount,
          category: expenseForm.category,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Could not add expense");
      setExpenseForm({ title: "", amount: "", category: "food" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add expense");
    } finally {
      setAddingExpense(false);
    }
  }

  async function deleteExpense(id: string) {
    if (readOnly) return;
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Could not delete");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const chapters = [
    {
      id: "journal" as const,
      no: "01",
      title: "Travel journal",
      subtitle: "Photos, moods & places",
      accent: "#C48A1A",
      hint: `${journalDays.filter((d) => d.journal && ((d.journal.photos?.length ?? 0) > 0 || d.journal.memory || d.journal.mood || d.journal.rating || (d.journal.places?.length ?? 0) > 0)).length} days filled`,
    },
    {
      id: "checklist" as const,
      no: "02",
      title: "Pack quests",
      subtitle: "Trail checklist",
      accent: "#127E83",
      hint: `${doneCount}/${checklistItems.length || 0} stamped`,
    },
    {
      id: "budget" as const,
      no: "03",
      title: "Spend ledger",
      subtitle: "Trip pocket",
      accent: "#E4574A",
      hint: `${spendPct}% of ceiling`,
    },
  ];

  const activeChapter = chapters.find((c) => c.id === tab) ?? chapters[0]!;

  return (
    <div className="trip-detail relative min-h-[70vh] overflow-x-hidden bg-white">
      <div className="relative mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <Link
          href="/dashboard/trips"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-[#012A3E]/65 uppercase transition hover:text-[#012A3E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trips
        </Link>

        {/* Cinematic masthead — not a card stack */}
        <header className="relative mt-4 overflow-hidden rounded-2xl sm:mt-5 sm:rounded-none">
          <div className="relative h-auto min-h-[220px] w-full overflow-hidden sm:h-[48vh] sm:min-h-[280px] sm:max-h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(1,42,62,0.92)_0%,rgba(1,42,62,0.55)_42%,rgba(1,42,62,0.18)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(1,42,62,0.9),transparent_55%)]" />

            <div className="relative z-10 flex flex-col justify-end p-4 pt-16 sm:absolute sm:inset-0 sm:p-8 lg:p-10">
              <p className="trip-atlas-ink font-mono text-[10px] tracking-[0.22em] text-[#9aebed] uppercase">
                Trip atlas · {trip.status}
              </p>
              <h1 className="mt-2 max-w-2xl font-display text-[1.85rem] leading-[1.05] font-semibold break-words text-white sm:text-5xl sm:leading-[0.95] lg:text-6xl">
                {trip.title}
              </h1>
              <div className="mt-3 flex flex-col gap-2 text-sm text-white/85 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9aebed]" />
                  <span className="truncate">
                    {[trip.destination?.city, trip.destination?.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide sm:text-xs">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#9aebed]" />
                  <span>
                    {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                  </span>
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                <Link
                  href={`/dashboard/trips/${trip.id}/book`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25 sm:px-3.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Export book
                </Link>
                {trip.status === "ongoing" || trip.status === "upcoming" ? (
                  <button
                    type="button"
                    disabled={pending || readOnly}
                    onClick={() => void markCompleted()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#127E83] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f6d71] disabled:opacity-60 sm:px-3.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark completed
                  </button>
                ) : null}
                {trip.status === "completed" && trip.destination ? (
                  <a
                    href="#trip-review"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#C48A1A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#a87516] sm:px-3.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {existingReview ? "Your review" : "Review destination"}
                  </a>
                ) : null}
              </div>

              {/* Inline pulse strip — stacks on narrow phones */}
              <div className="mt-4 grid max-w-xl grid-cols-1 overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md sm:mt-6 sm:grid-cols-3">
                {[
                  { label: "Ceiling", value: formatMoney(activeBudget) },
                  { label: "Out", value: formatMoney(spentTotal) },
                  { label: "Left", value: formatMoney(remainingTotal) },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`min-w-0 px-3 py-2.5 sm:px-4 ${
                      i > 0
                        ? "border-t border-white/15 sm:border-t-0 sm:border-l"
                        : ""
                    }`}
                  >
                    <p className="font-mono text-[9px] tracking-[0.18em] text-white/55 uppercase">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 truncate font-display text-sm font-semibold text-white sm:text-base">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Chapter spine + content — magazine atlas, not tabs */}
        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <nav
            aria-label="Trip chapters"
            className="lg:sticky lg:top-6 lg:self-start"
          >
            <p className="mb-2 font-mono text-[10px] tracking-[0.24em] text-[#012A3E]/45 uppercase sm:mb-3">
              Chapters
            </p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-[#012A3E]/15 lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {chapters.map((chapter) => {
                const active = tab === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => setTab(chapter.id)}
                    className={`group relative min-w-[7.75rem] shrink-0 rounded-xl px-2.5 py-2.5 text-left transition sm:min-w-[9.5rem] sm:rounded-none sm:px-3 sm:py-3 lg:min-w-0 lg:rounded-none lg:pl-5 lg:pr-2 ${
                      active
                        ? "bg-[#012A3E] text-white lg:bg-transparent lg:text-[#012A3E]"
                        : "bg-[#012A3E]/5 text-[#012A3E]/70 hover:bg-[#012A3E]/10 lg:bg-transparent"
                    }`}
                  >
                    <span
                      className={`absolute top-0 bottom-0 left-0 w-[3px] rounded-l-xl transition lg:left-[-1px] lg:rounded-none ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      }`}
                      style={{ backgroundColor: chapter.accent }}
                    />
                    <span
                      className={`font-mono text-[9px] tracking-[0.2em] uppercase sm:text-[10px] ${
                        active ? "text-white/70 lg:text-[#012A3E]/45" : "text-[#012A3E]/35"
                      }`}
                    >
                      Ch. {chapter.no}
                    </span>
                    <span className="mt-0.5 block font-display text-base leading-tight font-semibold sm:mt-1 sm:text-2xl sm:leading-none">
                      {chapter.title}
                    </span>
                    <span
                      className={`mt-0.5 block text-[10px] leading-snug sm:mt-1 sm:text-[11px] ${
                        active ? "text-white/65 lg:text-[#67717A]" : "text-[#94A3B8]"
                      }`}
                    >
                      {chapter.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 border-b border-[#012A3E]/15 pb-4 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p
                  className="trip-atlas-ink font-mono text-[10px] uppercase"
                  style={{ color: activeChapter.accent, letterSpacing: "0.22em" }}
                >
                  Chapter {activeChapter.no} · {activeChapter.subtitle}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#012A3E] sm:text-4xl">
                  {activeChapter.title}
                </h2>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                {tab === "journal" ? (
                  <Link
                    href={`/dashboard/trips/${trip.id}/book`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#012A3E] px-3 py-2 text-xs font-semibold text-white"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Export book
                  </Link>
                ) : null}
                <p className="max-w-xs text-left text-xs leading-relaxed text-[#67717A] sm:text-right">
                  {tab === "journal"
                    ? "Write the day, then seal the page."
                    : tab === "checklist"
                      ? "Stamp each waypoint before you go."
                      : "Keep the pocket honest — line by line."}
                </p>
              </div>
            </div>

            {error ? (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {tab === "journal" ? (
              <div
                key="journal"
                className="trip-atlas-panel trip-atlas-paper border border-[#012A3E]/10 p-3 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-dashed border-[#012A3E]/20 pb-3">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-[#8B5E34] uppercase">
                    Scrapbook sheet
                  </p>
                  <span className="rotate-[-6deg] border border-[#127E83]/35 px-2 py-1 font-mono text-[10px] tracking-wide text-[#127E83] uppercase">
                    Keep private
                  </span>
                </div>
                <TripTravelJournal
                  tripId={trip.id}
                  initialDays={journalDays}
                  readOnly={readOnly}
                  embedded
                  destinationLabel={
                    [
                      trip.destination?.city,
                      trip.destination?.country,
                      trip.destination?.title,
                    ]
                      .filter(Boolean)
                      .join(", ") || null
                  }
                />
              </div>
            ) : tab === "checklist" ? (
              <section
                key="quests"
                className="trip-atlas-panel trip-atlas-topo border border-[#127E83]/20"
              >
                <div className="flex flex-col items-stretch gap-0 border-b border-[#127E83]/15 sm:flex-row sm:flex-wrap">
                  <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-[#127E83] uppercase">
                      Waypoint progress
                    </p>
                    <p className="mt-2 font-display text-xl font-semibold text-[#012A3E] sm:text-2xl">
                      {questCopy}
                    </p>
                    <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden bg-[#012A3E]/10">
                      <div
                        className="travelia-budget-fill h-full bg-[#127E83]"
                        style={{ width: `${checklistPct}%` }}
                      />
                    </div>
                    <p className="mt-2 font-mono text-xs text-[#012A3E]/55">
                      {checklistPct}% · {doneCount} of{" "}
                      {checklistItems.length || 0} marked
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-center border-t border-[#127E83]/15 bg-[#012A3E] px-6 py-5 text-white sm:w-40 sm:border-t-0 sm:border-l sm:border-[#127E83]/15">
                    <div className="text-center">
                      <p className="font-display text-4xl font-semibold">
                        {checklistPct}
                      </p>
                      <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-[#9aebed] uppercase">
                        complete
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-5 sm:px-6">
                  {checklistItems.length === 0 ? (
                    <div className="border border-dashed border-[#127E83]/35 bg-white/50 px-5 py-12 text-center">
                      <Flag className="mx-auto h-8 w-8 text-[#127E83]" />
                      <p className="mt-4 font-display text-xl font-semibold text-[#012A3E]">
                        No waypoints yet
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-[#67717A]">
                        Plot the first quest — adapters, tickets, that viewpoint
                        you promised yourself.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-0">
                      {checklistItems.map((item, index) => (
                        <li
                          key={item.id || `${item.text}-${index}`}
                          className="trip-quest-item grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-[#012A3E]/08 py-3.5 last:border-b-0"
                          style={{
                            animationDelay: `${Math.min(index, 8) * 0.04}s`,
                          }}
                        >
                          <button
                            type="button"
                            disabled={readOnly || !item.id}
                            onClick={() =>
                              primaryChecklist &&
                              toggleItem(
                                primaryChecklist.id,
                                item.id,
                                !item.completed
                              )
                            }
                            className={`mt-0.5 flex h-9 w-9 items-center justify-center font-mono text-xs font-bold transition ${
                              item.completed
                                ? "trip-stamp-done bg-[#127E83] text-white"
                                : "border border-[#127E83]/40 bg-white text-[#127E83] hover:bg-[#127E83] hover:text-white"
                            }`}
                            aria-label={
                              item.completed
                                ? "Mark incomplete"
                                : "Mark complete"
                            }
                          >
                            {item.completed ? (
                              <Check
                                key={`done-${item.id}`}
                                className="travelia-check-pop h-4 w-4"
                                strokeWidth={2.5}
                              />
                            ) : (
                              String(index + 1).padStart(2, "0")
                            )}
                          </button>
                          <div className="min-w-0 pt-1">
                            <p
                              className={`text-sm font-semibold ${
                                item.completed
                                  ? "text-[#67717A] line-through decoration-[#127E83]/35"
                                  : "text-[#012A3E]"
                              }`}
                            >
                              {item.text}
                            </p>
                            <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-[#94A3B8] uppercase">
                              {item.completed
                                ? "Stamped on trail"
                                : `Waypoint ${String(index + 1).padStart(2, "0")}`}
                            </p>
                          </div>
                          {!readOnly && item.id && primaryChecklist ? (
                            <button
                              type="button"
                              onClick={() =>
                                removeChecklistItem(
                                  primaryChecklist.id,
                                  item.id
                                )
                              }
                              className="mt-1 p-1.5 text-[#94A3B8] hover:text-[#E4574A]"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}

                  {!readOnly ? (
                    <div className="mt-5 flex flex-col border border-[#012A3E] bg-[#012A3E] sm:flex-row">
                      <input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void addChecklistItem();
                          }
                        }}
                        placeholder="Add waypoint…"
                        disabled={addingChecklist}
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={addingChecklist || !newItem.trim()}
                        onClick={addChecklistItem}
                        aria-busy={addingChecklist}
                        className="inline-flex min-w-[7.5rem] items-center justify-center gap-1.5 border-t border-[#9aebed]/30 bg-[#9aebed] px-4 py-3 text-sm font-semibold text-[#012A3E] disabled:opacity-50 sm:border-t-0"
                      >
                        {addingChecklist ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding…
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Plot
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : (
              <section key="ledger" className="trip-atlas-panel space-y-6">
                {/* Summary */}
                <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e8eef0] sm:p-5">
                  <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-3">
                    <div className="rounded-xl bg-[#F4FAFB] px-3 py-3 sm:bg-transparent sm:px-0 sm:py-0">
                      <p className="text-xs text-[#94A3B8]">Budget</p>
                      <p className="mt-1 break-all font-display text-base font-semibold text-[#012A3E] sm:text-xl">
                        {formatMoney(activeBudget)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FFF5F4] px-3 py-3 sm:bg-transparent sm:px-0 sm:py-0">
                      <p className="text-xs text-[#94A3B8]">Spent</p>
                      <p className="mt-1 break-all font-display text-base font-semibold text-[#E4574A] sm:text-xl">
                        {formatMoney(spentTotal)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#EAF7F7] px-3 py-3 sm:bg-transparent sm:px-0 sm:py-0">
                      <p className="text-xs text-[#94A3B8]">Left</p>
                      <p className="mt-1 break-all font-display text-base font-semibold text-[#127E83] sm:text-xl">
                        {formatMoney(remainingTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef3f4]">
                    <div
                      className="travelia-budget-fill h-full rounded-full bg-[#127E83]"
                      style={{ width: `${spendPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-[#67717A]">
                    {spendPct}% used · {walletMood}
                  </p>

                  {!readOnly ? (
                    <label className="mt-5 block">
                      <span className="text-xs font-medium text-[#67717A]">
                        Update budget
                      </span>
                      <div className="relative mt-1.5 max-w-[10rem]">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94A3B8]">
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={budget}
                          disabled={pending}
                          onChange={(e) => setBudget(e.target.value)}
                          onBlur={() => void saveBudget()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pr-3 pl-7 text-sm text-[#012A3E] outline-none focus:border-[#127E83]"
                        />
                      </div>
                    </label>
                  ) : null}
                </div>

                {/* Add expense */}
                {!readOnly ? (
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-[#e8eef0]">
                    <h3 className="text-sm font-semibold text-[#012A3E]">
                      Add expense
                    </h3>
                    <form onSubmit={addExpense} className="mt-3 space-y-3">
                      <input
                        value={expenseForm.title}
                        onChange={(e) =>
                          setExpenseForm((f) => ({
                            ...f,
                            title: e.target.value,
                          }))
                        }
                        placeholder="What did you spend on?"
                        disabled={addingExpense}
                        className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#127E83] disabled:opacity-60"
                        required
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                          value={expenseForm.category}
                          onChange={(e) =>
                            setExpenseForm((f) => ({
                              ...f,
                              category: e.target.value,
                            }))
                          }
                          disabled={addingExpense}
                          className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#012A3E] outline-none focus:border-[#127E83] disabled:opacity-60 sm:w-40"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_META[c]!.label}
                            </option>
                          ))}
                        </select>
                        <div className="relative min-w-0 flex-1">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94A3B8]">
                            $
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={expenseForm.amount}
                            onChange={(e) =>
                              setExpenseForm((f) => ({
                                ...f,
                                amount: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            disabled={addingExpense}
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pr-3 pl-7 text-sm outline-none focus:border-[#127E83] disabled:opacity-60"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={addingExpense}
                          aria-busy={addingExpense}
                          className="inline-flex min-w-[6.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#012A3E] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {addingExpense ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Adding…
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {/* Expenses list */}
                <div className="rounded-2xl bg-white p-5 ring-1 ring-[#e8eef0]">
                  <h3 className="text-sm font-semibold text-[#012A3E]">
                    Expenses
                  </h3>
                  {expenses.length === 0 ? (
                    <p className="mt-3 text-sm text-[#67717A]">
                      No expenses logged yet.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#eef3f4]">
                      {expenses.map((expense) => {
                        const meta =
                          CATEGORY_META[expense.category] ||
                          CATEGORY_META.other!;
                        return (
                          <li
                            key={expense.id}
                            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#012A3E]">
                                {expense.title}
                              </p>
                              <p className="text-xs text-[#94A3B8]">
                                {meta.label} · {formatDate(expense.date)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-[#012A3E]">
                              {formatMoney(expense.amount)}
                            </p>
                            {!readOnly ? (
                              <button
                                type="button"
                                onClick={() => deleteExpense(expense.id)}
                                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-[#E4574A]"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {bookings.length > 0 ? (
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-[#e8eef0]">
                    <h3 className="text-sm font-semibold text-[#012A3E]">
                      Paid on Travelia
                    </h3>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                      Not counted in your expenses above
                    </p>
                    <ul className="mt-3 divide-y divide-[#eef3f4]">
                      {bookings.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
                        >
                          <span className="text-[#012A3E]">{b.label}</span>
                          <span className="text-[#67717A]">
                            {b.price > 0 ? formatMoney(b.price) : "Included"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            )}
          </div>
        </div>

        {trip.status === "completed" && trip.destination ? (
          <div id="trip-review">
            <TripReviewPanel
              tripId={trip.id}
              destinationId={trip.destination.id}
              destinationTitle={trip.destination.title}
              destinationHref={`/destinations/${trip.destination.id}`}
              initialReview={existingReview}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

