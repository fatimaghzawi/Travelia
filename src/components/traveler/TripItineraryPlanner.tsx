"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  GripVertical,
  NotebookPen,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

export type ItineraryStopData = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  reminderAt: string | null;
  reminderText: string | null;
  completed: boolean;
  order: number;
};

export type ItineraryDayData = {
  id: string;
  dayNumber: number;
  date: string;
  notes: string | null;
  stops: ItineraryStopData[];
  journal?: {
    photos: string[];
    memory: string | null;
    mood: string | null;
    rating: number | null;
    places: {
      id: string;
      name: string;
      note: string | null;
      lat: number | null;
      lng: number | null;
    }[];
  } | null;
};

type TripItineraryPlannerProps = {
  tripId: string;
  initialDays: ItineraryDayData[];
  readOnly?: boolean;
};

type DragPayload = {
  dayIndex: number;
  stopIndex: number;
};

type EditorState =
  | { kind: "stop"; dayIndex: number; stopIndex: number }
  | { kind: "dayNotes"; dayIndex: number }
  | null;

function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string) {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function reorderIds(days: ItineraryDayData[]): ItineraryDayData[] {
  return days.map((day, dayIndex) => ({
    ...day,
    dayNumber: dayIndex + 1,
    journal: day.journal ?? {
      photos: [],
      memory: null,
      mood: null,
      rating: null,
      places: [],
    },
    stops: day.stops.map((stop, stopIndex) => ({
      ...stop,
      order: stopIndex,
    })),
  }));
}

export function TripItineraryPlanner({
  tripId,
  initialDays,
  readOnly = false,
}: TripItineraryPlannerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const titleId = useId();
  const [days, setDays] = useState<ItineraryDayData[]>(() =>
    reorderIds(initialDays)
  );
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    dayIndex: number;
    stopIndex: number | null;
  } | null>(null);
  const [newTitles, setNewTitles] = useState<Record<number, string>>({});
  const [editor, setEditor] = useState<EditorState>(null);
  const [draft, setDraft] = useState({
    notes: "",
    startTime: "",
    reminderAt: "",
    reminderText: "",
    dayNotes: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const syncedInitial = useRef(false);

  useEffect(() => {
    if (!syncedInitial.current) {
      syncedInitial.current = true;
      return;
    }
    setDays(reorderIds(initialDays));
  }, [initialDays]);

  const totalStops = useMemo(
    () => days.reduce((sum, day) => sum + day.stops.length, 0),
    [days]
  );
  const doneStops = useMemo(
    () =>
      days.reduce(
        (sum, day) => sum + day.stops.filter((s) => s.completed).length,
        0
      ),
    [days]
  );

  async function persist(nextDays: ItineraryDayData[]) {
    if (readOnly) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: nextDays.map((day) => ({
            id: day.id.startsWith("day-") ? undefined : day.id,
            date: day.date,
            notes: day.notes,
            stops: day.stops.map((stop) => ({
              id: stop.id.startsWith("stop-") ? undefined : stop.id,
              title: stop.title,
              notes: stop.notes,
              startTime: stop.startTime,
              reminderAt: stop.reminderAt,
              reminderText: stop.reminderText,
              completed: stop.completed,
              order: stop.order,
            })),
            journal: {
              photos: day.journal?.photos ?? [],
              memory: day.journal?.memory ?? null,
              mood: day.journal?.mood ?? null,
              rating: day.journal?.rating ?? null,
              places: (day.journal?.places ?? []).map((place) => ({
                id: place.id.startsWith("place-") ? undefined : place.id,
                name: place.name,
                note: place.note,
                lat: place.lat,
                lng: place.lng,
              })),
            },
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save itinerary");
      }
      const saved = (json.data?.days ?? []) as ItineraryDayData[];
      if (saved.length) setDays(reorderIds(saved));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1400);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save itinerary");
    } finally {
      setPending(false);
    }
  }

  function updateDays(
    updater: (prev: ItineraryDayData[]) => ItineraryDayData[],
    save = true
  ) {
    setDays((prev) => {
      const next = reorderIds(updater(prev));
      if (save) void persist(next);
      return next;
    });
  }

  function addStop(dayIndex: number) {
    const title = (newTitles[dayIndex] || "").trim();
    if (!title) return;
    updateDays((prev) =>
      prev.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              stops: [
                ...day.stops,
                {
                  id: `stop-new-${Date.now()}`,
                  title,
                  notes: null,
                  startTime: null,
                  reminderAt: null,
                  reminderText: null,
                  completed: false,
                  order: day.stops.length,
                },
              ],
            }
      )
    );
    setNewTitles((t) => ({ ...t, [dayIndex]: "" }));
  }

  function toggleStop(dayIndex: number, stopIndex: number) {
    updateDays((prev) =>
      prev.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              stops: day.stops.map((stop, j) =>
                j !== stopIndex
                  ? stop
                  : { ...stop, completed: !stop.completed }
              ),
            }
      )
    );
  }

  function removeStop(dayIndex: number, stopIndex: number) {
    updateDays((prev) =>
      prev.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              stops: day.stops.filter((_, j) => j !== stopIndex),
            }
      )
    );
  }

  function openStopEditor(dayIndex: number, stopIndex: number) {
    const stop = days[dayIndex]?.stops[stopIndex];
    if (!stop) return;
    setDraft({
      notes: stop.notes || "",
      startTime: stop.startTime || "",
      reminderAt: toLocalInputValue(stop.reminderAt),
      reminderText: stop.reminderText || "",
      dayNotes: "",
    });
    setEditor({ kind: "stop", dayIndex, stopIndex });
  }

  function openDayNotes(dayIndex: number) {
    setDraft({
      notes: "",
      startTime: "",
      reminderAt: "",
      reminderText: "",
      dayNotes: days[dayIndex]?.notes || "",
    });
    setEditor({ kind: "dayNotes", dayIndex });
  }

  function saveEditor() {
    if (!editor) return;
    if (editor.kind === "dayNotes") {
      updateDays((prev) =>
        prev.map((day, i) =>
          i !== editor.dayIndex
            ? day
            : { ...day, notes: draft.dayNotes.trim() || null }
        )
      );
    } else {
      updateDays((prev) =>
        prev.map((day, i) =>
          i !== editor.dayIndex
            ? day
            : {
                ...day,
                stops: day.stops.map((stop, j) =>
                  j !== editor.stopIndex
                    ? stop
                    : {
                        ...stop,
                        notes: draft.notes.trim() || null,
                        startTime: draft.startTime.trim() || null,
                        reminderAt: fromLocalInputValue(draft.reminderAt),
                        reminderText: draft.reminderText.trim() || null,
                      }
                ),
              }
        )
      );
    }
    setEditor(null);
  }

  function onDragStart(
    e: DragEvent,
    dayIndex: number,
    stopIndex: number
  ) {
    if (readOnly) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/x-travelia-stop",
      JSON.stringify({ dayIndex, stopIndex } satisfies DragPayload)
    );
    setDrag({ dayIndex, stopIndex });
  }

  function onDragOverDay(e: DragEvent, dayIndex: number) {
    if (readOnly || !drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ dayIndex, stopIndex: null });
  }

  function onDragOverStop(
    e: DragEvent,
    dayIndex: number,
    stopIndex: number
  ) {
    if (readOnly || !drag) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ dayIndex, stopIndex });
  }

  function onDrop(e: DragEvent, dayIndex: number, stopIndex: number | null) {
    e.preventDefault();
    if (readOnly || !drag) return;

    const fromDay = drag.dayIndex;
    const fromStop = drag.stopIndex;
    setDrag(null);
    setDropTarget(null);

    updateDays((prev) => {
      const clone = prev.map((day) => ({
        ...day,
        stops: [...day.stops],
      }));
      const sourceDay = clone[fromDay];
      if (!sourceDay) return prev;
      const [moved] = sourceDay.stops.splice(fromStop, 1);
      if (!moved) return prev;

      const targetDay = clone[dayIndex];
      if (!targetDay) return prev;

      const insertAt =
        stopIndex == null
          ? targetDay.stops.length
          : Math.min(stopIndex, targetDay.stops.length);
      targetDay.stops.splice(insertAt, 0, moved);
      return clone;
    });
  }

  function onDragEnd() {
    setDrag(null);
    setDropTarget(null);
  }

  return (
    <section className="animate-[tripPop_0.4s_ease-out] overflow-hidden rounded-3xl bg-white ring-1 ring-[#e8eef0]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#012A3E] via-[#0d4a5c] to-[#127E83] px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-[#9aebed]/15 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#9aebed] uppercase">
              Itinerary planner
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Timeline of your days
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {days.length} day{days.length === 1 ? "" : "s"} · drag stops · notes
              & reminders
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right backdrop-blur-sm ring-1 ring-white/15">
            <p className="text-[10px] tracking-wide text-white/70 uppercase">
              Progress
            </p>
            <p className="font-display text-lg font-semibold">
              {doneStops}/{totalStops || 0} stamped
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {savedFlash ? (
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#127E83] uppercase">
            Itinerary saved
          </p>
        ) : null}
        {pending ? (
          <p className="mb-3 text-xs text-[#94A3B8]">Saving…</p>
        ) : null}

        <div className="relative space-y-6 before:absolute before:top-3 before:bottom-3 before:left-[1.15rem] before:w-px before:bg-gradient-to-b before:from-[#127E83] before:via-[#d1e8ea] before:to-transparent sm:before:left-[1.35rem]">
          {days.map((day, dayIndex) => {
            const dayDone = day.stops.filter((s) => s.completed).length;
            const isDropDay =
              dropTarget?.dayIndex === dayIndex &&
              dropTarget.stopIndex == null;

            return (
              <article key={day.id} className="relative pl-10 sm:pl-12">
                <div className="absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#012A3E] font-display text-sm font-semibold text-white shadow-[0_8px_20px_rgba(1,42,62,0.25)] sm:h-10 sm:w-10">
                  {day.dayNumber}
                </div>

                <div
                  className={`rounded-2xl bg-[#F4FAFB] p-3.5 ring-1 transition sm:p-4 ${
                    isDropDay
                      ? "ring-[#127E83] ring-offset-2"
                      : "ring-[#e4eef0]"
                  }`}
                  onDragOver={(e) => onDragOverDay(e, dayIndex)}
                  onDrop={(e) => onDrop(e, dayIndex, null)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#012A3E]">
                        Day {day.dayNumber}
                      </h3>
                      <p className="text-xs text-[#67717A]">
                        {formatDayLabel(day.date)}
                        {day.stops.length > 0
                          ? ` · ${dayDone}/${day.stops.length} done`
                          : " · open canvas"}
                      </p>
                    </div>
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={() => openDayNotes(dayIndex)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#127E83] ring-1 ring-[#d1e8ea]"
                      >
                        <NotebookPen className="h-3.5 w-3.5" />
                        {day.notes ? "Edit day note" : "Day note"}
                      </button>
                    ) : null}
                  </div>

                  {day.notes ? (
                    <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#3B6B8C] ring-1 ring-[#d7e8ea]">
                      <StickyNote className="mr-1 inline h-3.5 w-3.5" />
                      {day.notes}
                    </p>
                  ) : null}

                  <ul className="mt-3 space-y-2">
                    {day.stops.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-[#c9dde0] bg-white/60 px-3 py-4 text-center text-xs text-[#94A3B8]">
                        Drop stops here or add one below
                      </li>
                    ) : (
                      day.stops.map((stop, stopIndex) => {
                        const dragging =
                          drag?.dayIndex === dayIndex &&
                          drag.stopIndex === stopIndex;
                        const isOver =
                          dropTarget?.dayIndex === dayIndex &&
                          dropTarget.stopIndex === stopIndex;
                        return (
                          <li
                            key={stop.id}
                            draggable={!readOnly}
                            onDragStart={(e) =>
                              onDragStart(e, dayIndex, stopIndex)
                            }
                            onDragOver={(e) =>
                              onDragOverStop(e, dayIndex, stopIndex)
                            }
                            onDrop={(e) => onDrop(e, dayIndex, stopIndex)}
                            onDragEnd={onDragEnd}
                            className={`group flex items-start gap-2 rounded-xl bg-white px-2.5 py-2.5 shadow-sm ring-1 transition ${
                              stop.completed
                                ? "ring-[#b7e0e2]"
                                : "ring-[#e8eef0]"
                            } ${dragging ? "opacity-40" : ""} ${
                              isOver ? "ring-[#127E83] ring-offset-1" : ""
                            }`}
                          >
                            {!readOnly ? (
                              <span className="mt-1 cursor-grab text-[#c5d0d4] active:cursor-grabbing">
                                <GripVertical className="h-4 w-4" />
                              </span>
                            ) : null}

                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => toggleStop(dayIndex, stopIndex)}
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
                                stop.completed
                                  ? "bg-[#127E83] text-white"
                                  : "bg-[#F4FAFB] text-[#94A3B8] ring-1 ring-[#d1e8ea] hover:text-[#127E83]"
                              }`}
                              aria-label={
                                stop.completed
                                  ? "Mark incomplete"
                                  : "Mark complete"
                              }
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {stop.startTime ? (
                                  <span className="rounded-md bg-[#EEF6F7] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#127E83]">
                                    {stop.startTime}
                                  </span>
                                ) : null}
                                <p
                                  className={`text-sm font-semibold ${
                                    stop.completed
                                      ? "text-[#67717A] line-through"
                                      : "text-[#012A3E]"
                                  }`}
                                >
                                  {stop.title}
                                </p>
                              </div>
                              {stop.notes ? (
                                <p className="mt-0.5 text-xs text-[#67717A]">
                                  {stop.notes}
                                </p>
                              ) : null}
                              {stop.reminderAt ? (
                                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#C48A1A]">
                                  <Bell className="h-3 w-3" />
                                  {new Date(stop.reminderAt).toLocaleString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    }
                                  )}
                                  {stop.reminderText
                                    ? ` · ${stop.reminderText}`
                                    : ""}
                                </p>
                              ) : null}
                            </div>

                            {!readOnly ? (
                              <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openStopEditor(dayIndex, stopIndex)
                                  }
                                  className="rounded-lg p-1.5 text-[#67717A] hover:bg-[#F4FAFB] hover:text-[#127E83]"
                                  aria-label="Notes & reminder"
                                >
                                  <Bell className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeStop(dayIndex, stopIndex)
                                  }
                                  className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-[#E4574A]"
                                  aria-label="Remove stop"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })
                    )}
                  </ul>

                  {!readOnly ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={newTitles[dayIndex] || ""}
                        onChange={(e) =>
                          setNewTitles((t) => ({
                            ...t,
                            [dayIndex]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addStop(dayIndex);
                          }
                        }}
                        placeholder="Add stop — Beach, Museum, Lunch…"
                        className="min-w-0 flex-1 rounded-xl border border-[#d1e8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#127E83]"
                      />
                      <button
                        type="button"
                        disabled={!(newTitles[dayIndex] || "").trim()}
                        onClick={() => addStop(dayIndex)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#127E83] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {editor && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex items-end justify-center bg-[#012A3E]/50 p-3 backdrop-blur-[2px] sm:items-center"
              role="presentation"
              onClick={() => setEditor(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="animate-[tripPop_0.3s_ease-out] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between bg-[#012A3E] px-4 py-3 text-white">
                  <h3 id={titleId} className="font-semibold">
                    {editor.kind === "dayNotes"
                      ? `Day ${editor.dayIndex + 1} notes`
                      : "Notes & reminder"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditor(null)}
                    className="rounded-lg p-1 hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  {editor.kind === "dayNotes" ? (
                    <label className="block text-sm">
                      <span className="text-[#67717A]">Day notes</span>
                      <textarea
                        value={draft.dayNotes}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, dayNotes: e.target.value }))
                        }
                        rows={4}
                        className="mt-1 w-full rounded-xl border border-[#d1e8ea] px-3 py-2 outline-none focus:border-[#127E83]"
                        placeholder="Morning vibe, meeting point, weather plan…"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="block text-sm">
                        <span className="text-[#67717A]">Start time</span>
                        <input
                          type="time"
                          value={draft.startTime}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              startTime: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-[#d1e8ea] px-3 py-2 outline-none focus:border-[#127E83]"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-[#67717A]">Notes</span>
                        <textarea
                          value={draft.notes}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, notes: e.target.value }))
                          }
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-[#d1e8ea] px-3 py-2 outline-none focus:border-[#127E83]"
                          placeholder="Tickets, dress code, meetup tip…"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-[#67717A]">Reminder</span>
                        <input
                          type="datetime-local"
                          value={draft.reminderAt}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              reminderAt: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-[#d1e8ea] px-3 py-2 outline-none focus:border-[#127E83]"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-[#67717A]">Reminder text</span>
                        <input
                          value={draft.reminderText}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              reminderText: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-[#d1e8ea] px-3 py-2 outline-none focus:border-[#127E83]"
                          placeholder="Leave for airport / confirm tickets"
                        />
                      </label>
                    </>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditor(null)}
                      className="flex-1 rounded-xl border border-[#d7e0e4] px-3 py-2.5 text-sm font-medium text-[#012A3E]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEditor}
                      className="flex-1 rounded-xl bg-[#127E83] px-3 py-2.5 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
