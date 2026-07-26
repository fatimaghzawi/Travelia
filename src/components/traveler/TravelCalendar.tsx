"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Ticket,
} from "lucide-react";
import type { DashboardCalendarEvent } from "@/lib/trips/dashboard";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TravelCalendarProps = {
  events: DashboardCalendarEvent[];
};

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDay(iso: string) {
  return startOfDay(new Date(iso));
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const pad = (x.getDay() + 6) % 7;
  return addDays(x, -pad);
}

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const a = new Date(start);
  const b = new Date(end);
  if (dayKey(a) === dayKey(b)) {
    return a.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  }
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

function eventSpanDays(ev: DashboardCalendarEvent) {
  const start = parseDay(ev.startDate).getTime();
  const end = parseDay(ev.endDate).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function eventsForDay(events: DashboardCalendarEvent[], date: Date) {
  const t = startOfDay(date).getTime();
  return events.filter((ev) => {
    const start = parseDay(ev.startDate).getTime();
    const end = parseDay(ev.endDate).getTime();
    return t >= start && t <= end;
  });
}

function isInRange(date: Date, ev: DashboardCalendarEvent) {
  const t = startOfDay(date).getTime();
  return (
    t >= parseDay(ev.startDate).getTime() &&
    t <= parseDay(ev.endDate).getTime()
  );
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: dayKey(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `trail-${cells.length}` });
  }
  return cells;
}

type Segment = {
  event: DashboardCalendarEvent;
  role: "start" | "middle" | "end" | "single";
};

function segmentsForDay(
  events: DashboardCalendarEvent[],
  date: Date
): Segment[] {
  return eventsForDay(events, date).map((event) => {
    const start = dayKey(parseDay(event.startDate));
    const end = dayKey(parseDay(event.endDate));
    const key = dayKey(date);
    if (start === end) return { event, role: "single" as const };
    if (key === start) return { event, role: "start" as const };
    if (key === end) return { event, role: "end" as const };
    return { event, role: "middle" as const };
  });
}

function barClass(kind: DashboardCalendarEvent["kind"], focused: boolean) {
  if (kind === "trip") {
    return focused
      ? "bg-[#012A3E] text-[#9aebed]"
      : "bg-[#127E83] text-white hover:bg-[#0f6d71]";
  }
  return focused
    ? "bg-[#012A3E] text-[#f0d080]"
    : "bg-[#C48A1A] text-white hover:bg-[#a87516]";
}

function roleRadius(role: Segment["role"]) {
  if (role === "single") return "rounded-md";
  if (role === "start") return "rounded-l-md rounded-r-sm";
  if (role === "end") return "rounded-r-md rounded-l-sm";
  return "rounded-sm";
}

export function TravelCalendar({ events }: TravelCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<"month" | "week">("month");
  const [filter, setFilter] = useState<"all" | "trip" | "booking">("all");
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(today));
  const [selectedKey, setSelectedKey] = useState(() => dayKey(today));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const gridRef = useRef<HTMLDivElement | null>(null);

  const visibleEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.kind === filter);
  }, [events, filter]);

  const focusedEvent = useMemo(
    () => visibleEvents.find((e) => e.id === focusedId) ?? null,
    [visibleEvents, focusedId]
  );

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  }, [selectedKey]);

  const selectedEvents = useMemo(
    () => eventsForDay(visibleEvents, selectedDate),
    [visibleEvents, selectedDate]
  );

  const monthCells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  }, [weekAnchor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const weekLabel = `${weekDays[0]!.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6]!.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const hoverEvents = useMemo(() => {
    if (!hoverKey) return [];
    const [y, m, d] = hoverKey.split("-").map(Number);
    return eventsForDay(visibleEvents, new Date(y!, m! - 1, d!));
  }, [hoverKey, visibleEvents]);

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setWeekAnchor(startOfWeek(today));
    setSelectedKey(dayKey(today));
    setFocusedId(null);
  }

  function shift(delta: number) {
    if (view === "month") {
      setCursor(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      );
    } else {
      setWeekAnchor((prev) => addDays(prev, delta * 7));
    }
  }

  function selectDay(date: Date) {
    setSelectedKey(dayKey(date));
    setFocusedId(null);
  }

  function focusEvent(ev: DashboardCalendarEvent, date?: Date) {
    setFocusedId(ev.id);
    if (date) setSelectedKey(dayKey(date));
    else setSelectedKey(dayKey(parseDay(ev.startDate)));
    // Jump calendar to event start if needed
    const start = parseDay(ev.startDate);
    setCursor(new Date(start.getFullYear(), start.getMonth(), 1));
    setWeekAnchor(startOfWeek(start));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocusedId(null);
      if (e.key === "ArrowLeft") {
        const next = addDays(selectedDate, -1);
        setSelectedKey(dayKey(next));
        if (view === "week") setWeekAnchor(startOfWeek(next));
        else setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
      }
      if (e.key === "ArrowRight") {
        const next = addDays(selectedDate, 1);
        setSelectedKey(dayKey(next));
        if (view === "week") setWeekAnchor(startOfWeek(next));
        else setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDate, view]);

  const displayDays =
    view === "month"
      ? monthCells
      : weekDays.map((date) => ({ date, key: dayKey(date) }));

  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-[#e8eef0]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eef0] px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#F4FAFB] p-0.5">
            {(
              [
                ["month", "Month"],
                ["week", "Week"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                  if (id === "week") setWeekAnchor(startOfWeek(selectedDate));
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  view === id
                    ? "bg-[#012A3E] text-white"
                    : "text-[#67717A] hover:text-[#012A3E]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#127E83] hover:bg-[#127E83]/10"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#012A3E] transition hover:bg-[#F4FAFB]"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[9rem] text-center text-sm font-semibold text-[#012A3E]">
              {view === "month" ? monthLabel : weekLabel}
            </p>
            <button
              type="button"
              onClick={() => shift(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#012A3E] transition hover:bg-[#F4FAFB]"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[#e8eef0] px-4 py-2.5 sm:px-5">
        {(
          [
            ["all", "All"],
            ["trip", "Trips"],
            ["booking", "Bookings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setFocusedId(null);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              filter === id
                ? id === "booking"
                  ? "bg-[#C48A1A] text-white"
                  : id === "trip"
                    ? "bg-[#127E83] text-white"
                    : "bg-[#012A3E] text-white"
                : "bg-[#F4FAFB] text-[#67717A] hover:text-[#012A3E]"
            }`}
          >
            {label}
          </button>
        ))}
        {focusedEvent ? (
          <button
            type="button"
            onClick={() => setFocusedId(null)}
            className="ml-auto rounded-full bg-[#012A3E]/8 px-2.5 py-1 text-[11px] font-semibold text-[#012A3E]"
          >
            Clear focus · {focusedEvent.title}
          </button>
        ) : null}
      </div>

      <div
        ref={gridRef}
        className="relative px-2 py-3 sm:px-4 sm:py-4"
        onMouseLeave={() => {
          setHoverKey(null);
          setHoverPos(null);
        }}
      >
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        <div
          className={`grid grid-cols-7 gap-1 ${
            view === "week" ? "auto-rows-[7.5rem] sm:auto-rows-[8.5rem]" : ""
          }`}
        >
          {displayDays.map((cell) => {
            if (!cell.date) {
              return (
                <div
                  key={cell.key}
                  className={view === "month" ? "min-h-[3.75rem] sm:min-h-[5.25rem]" : ""}
                />
              );
            }

            const key = dayKey(cell.date);
            const segs = segmentsForDay(visibleEvents, cell.date).slice(0, 3);
            const extra =
              eventsForDay(visibleEvents, cell.date).length - segs.length;
            const isToday = key === dayKey(today);
            const isSelected = key === selectedKey;
            const inFocus =
              focusedEvent != null && isInRange(cell.date, focusedEvent);
            const dimmed = focusedEvent != null && !inFocus;

            return (
              <div
                key={cell.key}
                role="button"
                tabIndex={0}
                onClick={() => selectDay(cell.date!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectDay(cell.date!);
                  }
                }}
                onMouseEnter={(e) => {
                  setHoverKey(key);
                  const rect = gridRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoverPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseMove={(e) => {
                  const rect = gridRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoverPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1 transition ${
                  view === "month"
                    ? "min-h-[3.75rem] sm:min-h-[5.25rem]"
                    : "min-h-[6.5rem] sm:min-h-[7.5rem]"
                } ${
                  isSelected
                    ? "border-[#012A3E] bg-[#012A3E]/[0.04] shadow-[inset_0_0_0_1px_#012A3E]"
                    : inFocus
                      ? "border-[#127E83]/50 bg-[#127E83]/8"
                      : isToday
                        ? "border-[#127E83]/35 bg-[#127E83]/6"
                        : "border-transparent bg-[#f8fafb] hover:border-[#d1e8ea] hover:bg-white"
                } ${dimmed ? "opacity-40" : "opacity-100"}`}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-[#127E83] text-white"
                        : isSelected
                          ? "bg-[#012A3E] text-white"
                          : "text-[#012A3E]"
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                  {segs.length > 0 ? (
                    <span className="text-[9px] font-semibold text-[#94A3B8]">
                      {segs.length + Math.max(0, extra)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5">
                  {segs.map((seg) => {
                    const focused = focusedId === seg.event.id;
                    const showLabel =
                      seg.role === "start" ||
                      seg.role === "single" ||
                      view === "week";
                    return (
                      <button
                        key={seg.event.id}
                        type="button"
                        title={seg.event.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          focusEvent(seg.event, cell.date!);
                        }}
                        className={`flex h-4 w-full items-center overflow-hidden px-1 text-left text-[9px] font-semibold leading-none transition sm:h-[1.15rem] sm:text-[10px] ${roleRadius(seg.role)} ${barClass(seg.event.kind, focused)}`}
                      >
                        {showLabel ? (
                          <span className="truncate">{seg.event.title}</span>
                        ) : (
                          <span className="sr-only">{seg.event.title}</span>
                        )}
                      </button>
                    );
                  })}
                  {extra > 0 ? (
                    <span className="px-1 text-[9px] font-semibold text-[#67717A]">
                      +{extra} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover preview */}
        {hoverKey && hoverPos && hoverEvents.length > 0 ? (
          <div
            className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[110%] rounded-xl bg-[#012A3E] p-3 text-white shadow-xl"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <p className="text-[10px] font-semibold tracking-wide text-[#9aebed] uppercase">
              {new Date(hoverKey).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {hoverEvents.slice(0, 4).map((ev) => (
                <li key={ev.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      ev.kind === "trip" ? "bg-[#9aebed]" : "bg-[#f0d080]"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {ev.title}
                    </span>
                    <span className="text-white/60">
                      {ev.kind === "trip" ? "Trip" : "Booking"}
                      {ev.place ? ` · ${ev.place}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Day detail dock */}
      <div className="border-t border-[#e8eef0] bg-[#f8fafb] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#94A3B8] uppercase">
              {focusedEvent ? "Focused journey" : "Selected day"}
            </p>
            <p className="mt-0.5 font-display text-lg font-semibold text-[#012A3E]">
              {focusedEvent
                ? focusedEvent.title
                : selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
            </p>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            ← → move days · Esc clears focus
          </p>
        </div>

        {focusedEvent ? (
          <div className="mt-3 overflow-hidden rounded-2xl bg-white ring-1 ring-[#e8eef0]">
            <div
              className={`h-1.5 ${
                focusedEvent.kind === "trip" ? "bg-[#127E83]" : "bg-[#C48A1A]"
              }`}
            />
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#67717A]">
                  {focusedEvent.kind === "trip" ? (
                    <CalendarDays className="h-3.5 w-3.5 text-[#127E83]" />
                  ) : (
                    <Ticket className="h-3.5 w-3.5 text-[#C48A1A]" />
                  )}
                  {focusedEvent.kind === "trip" ? "Trip" : "Booking"} ·{" "}
                  {eventSpanDays(focusedEvent)}{" "}
                  {eventSpanDays(focusedEvent) === 1 ? "day" : "days"}
                </p>
                <p className="mt-1 text-sm text-[#67717A]">
                  {formatRange(focusedEvent.startDate, focusedEvent.endDate)}
                </p>
                {focusedEvent.place ? (
                  <p className="mt-1 flex items-center gap-1 text-sm text-[#012A3E]">
                    <MapPin className="h-3.5 w-3.5 text-[#127E83]" />
                    {focusedEvent.place}
                  </p>
                ) : null}
              </div>
              <Link
                href={focusedEvent.href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#012A3E] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#02364d]"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {/* Mini timeline of focused range within current month/week */}
            <div className="border-t border-[#eef3f4] px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
                On this calendar
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: eventSpanDays(focusedEvent) }, (_, i) => {
                  const d = addDays(parseDay(focusedEvent.startDate), i);
                  const key = dayKey(d);
                  const active = key === selectedKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                        active
                          ? "bg-[#127E83] text-white"
                          : "bg-[#F4FAFB] text-[#012A3E] hover:bg-[#e8eef0]"
                      }`}
                    >
                      {d.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : selectedEvents.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#d1e8ea] bg-white px-4 py-6 text-center">
            <p className="text-sm text-[#67717A]">
              Free day — explore destinations or plan your next trip.
            </p>
            <Link
              href="/destinations"
              className="mt-3 inline-flex text-xs font-semibold text-[#127E83] hover:underline"
            >
              Browse destinations
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedEvents.map((ev) => (
              <li key={ev.id}>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => focusEvent(ev)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-[#e8eef0] transition hover:ring-[#127E83]/40"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        ev.kind === "trip" ? "bg-[#127E83]" : "bg-[#C48A1A]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#012A3E]">
                        {ev.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#67717A]">
                        {ev.kind === "trip" ? "Trip" : "Booking"}
                        {ev.place ? ` · ${ev.place}` : ""}
                        {" · "}
                        {formatRange(ev.startDate, ev.endDate)}
                      </span>
                    </span>
                    <span className="shrink-0 self-center text-[10px] font-semibold text-[#127E83]">
                      Focus
                    </span>
                  </button>
                  <Link
                    href={ev.href}
                    className="inline-flex items-center rounded-xl bg-[#012A3E] px-3 text-white transition hover:bg-[#02364d]"
                    aria-label={`Open ${ev.title}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
