"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Check,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  TripDayData,
  TripJournalData,
} from "@/components/traveler/trip-day-types";

const MOODS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "adventurous", label: "Adventurous", emoji: "🧭" },
  { id: "relaxed", label: "Relaxed", emoji: "🌴" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "romantic", label: "Romantic", emoji: "💛" },
  { id: "amazed", label: "Amazed", emoji: "✨" },
  { id: "grateful", label: "Grateful", emoji: "🙏" },
] as const;

type TripTravelJournalProps = {
  tripId: string;
  initialDays: TripDayData[];
  readOnly?: boolean;
  destinationLabel?: string | null;
  /** Hide the outer branded banner when the parent page provides chapter chrome */
  embedded?: boolean;
};

type GeoHit = { label: string; lat: number; lng: number };

function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function mapEmbedSrc(lat: number, lng: number) {
  const d = 0.03;
  const bbox = `${lng - d}%2C${lat - d * 0.7}%2C${lng + d}%2C${lat + d * 0.7}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function mapsSearchUrl(name: string, lat?: number | null, lng?: number | null) {
  if (lat != null && lng != null) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(name)}`;
}

function photosOf(journal?: TripJournalData | null): string[] {
  if (!journal) return [];
  const raw = journal.photos as unknown;
  if (Array.isArray(raw)) {
    return raw.map(String).map((p) => p.trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function dayHasContent(journal?: TripJournalData | null) {
  if (!journal) return false;
  return (
    photosOf(journal).length > 0 ||
    Boolean(journal.memory?.trim()) ||
    Boolean(journal.mood) ||
    Boolean(journal.rating) ||
    (journal.places?.length ?? 0) > 0
  );
}

function moodMeta(id: string | null | undefined) {
  return MOODS.find((m) => m.id === id) ?? null;
}

function ensureJournal(day: TripDayData): TripDayData {
  const base = day.journal;
  return {
    ...day,
    journal: {
      photos: photosOf(base),
      memory:
        typeof base?.memory === "string" && base.memory.trim()
          ? base.memory.trim()
          : null,
      mood: base?.mood ?? null,
      rating: typeof base?.rating === "number" ? base.rating : null,
      places: Array.isArray(base?.places) ? base.places : [],
    },
  };
}

function mergeDays(incoming: TripDayData[], previous: TripDayData[]): TripDayData[] {
  return incoming.map((day, index) => {
    const next = ensureJournal(day);
    const prev = previous[index] ? ensureJournal(previous[index]!) : null;
    if (!prev) return next;

    const nextFilled = dayHasContent(next.journal);
    const prevFilled = dayHasContent(prev.journal);

    // Keep richer local journal if a refresh briefly returns an empty day
    if (!nextFilled && prevFilled) {
      return {
        ...next,
        journal: prev.journal,
      };
    }

    const nextPhotos = photosOf(next.journal);
    const prevPhotos = photosOf(prev.journal);
    if (nextPhotos.length === 0 && prevPhotos.length > 0) {
      return {
        ...next,
        journal: {
          ...next.journal!,
          photos: prevPhotos,
          memory: next.journal?.memory || prev.journal?.memory || null,
          mood: next.journal?.mood ?? prev.journal?.mood ?? null,
          rating: next.journal?.rating ?? prev.journal?.rating ?? null,
          places:
            (next.journal?.places?.length ?? 0) > 0
              ? next.journal!.places
              : prev.journal!.places,
        },
      };
    }
    return next;
  });
}

export function TripTravelJournal({
  tripId,
  initialDays,
  readOnly = false,
  destinationLabel,
  embedded = false,
}: TripTravelJournalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [days, setDays] = useState(() =>
    initialDays.map((d) => ensureJournal(d))
  );
  const [activeDay, setActiveDay] = useState(0);
  const [editing, setEditing] = useState(
    () => !dayHasContent(initialDays[0]?.journal)
  );
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [placeDraft, setPlaceDraft] = useState("");
  const [geoHits, setGeoHits] = useState<GeoHit[]>([]);
  const [geoPending, setGeoPending] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState(
    () => initialDays[0]?.journal?.memory || ""
  );
  const skipNextInitialSync = useRef(false);
  const initialDaysKey = useMemo(
    () =>
      JSON.stringify(
        initialDays.map((d) => ({
          id: d.id,
          date: d.date,
          journal: d.journal ?? null,
        }))
      ),
    [initialDays]
  );
  const syncedInitialKey = useRef<string | null>(null);

  // Sync from server only after a real prop change — never on first mount
  // (initializer already seeded state; mount setState triggers React 19 warning).
  useEffect(() => {
    if (skipNextInitialSync.current) {
      skipNextInitialSync.current = false;
      syncedInitialKey.current = initialDaysKey;
      return;
    }
    if (syncedInitialKey.current === null) {
      syncedInitialKey.current = initialDaysKey;
      return;
    }
    if (syncedInitialKey.current === initialDaysKey) return;
    syncedInitialKey.current = initialDaysKey;
    setDays((prev) => mergeDays(initialDays, prev));
  }, [initialDays, initialDaysKey]);

  function selectDay(index: number) {
    if (index === activeDay) return;
    const next = days[index];
    const nextJournal = next?.journal;
    setActiveDay(index);
    setMemoryDraft(nextJournal?.memory || "");
    setPlaceDraft("");
    setGeoHits([]);
    setEditing(!dayHasContent(nextJournal));
  }

  const day = days[activeDay] ?? days[0];
  const journal = day?.journal;
  const photos = photosOf(journal);
  const photoCount = photos.length;
  const atPhotoLimit = photoCount >= 12;
  const saved = dayHasContent(journal) && !editing;
  const mood = moodMeta(journal?.mood);

  const filledDays = useMemo(
    () => days.filter((d) => dayHasContent(ensureJournal(d).journal)).length,
    [days]
  );

  function applyJournalLocally(
    dayIndex: number,
    nextJournal: TripJournalData,
    revealSaved?: boolean
  ) {
    const normalized: TripJournalData = {
      photos: photosOf(nextJournal),
      memory:
        typeof nextJournal.memory === "string" && nextJournal.memory.trim()
          ? nextJournal.memory.trim()
          : null,
      mood: nextJournal.mood ?? null,
      rating: typeof nextJournal.rating === "number" ? nextJournal.rating : null,
      places: Array.isArray(nextJournal.places) ? nextJournal.places : [],
    };

    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...ensureJournal(d), journal: normalized }
          : d
      )
    );

    if (dayIndex === activeDay) {
      setMemoryDraft(normalized.memory || "");
      if (revealSaved && dayHasContent(normalized)) {
        setEditing(false);
      }
    }
  }

  async function persistDayJournal(
    dayIndex: number,
    nextJournal: TripJournalData,
    dayDate?: string,
    options?: { revealSaved?: boolean }
  ) {
    if (readOnly) return;
    setPending(true);
    setError(null);

    const photoUrls = photosOf(nextJournal);
    const optimistic: TripJournalData = {
      ...nextJournal,
      photos: photoUrls,
      memory:
        typeof nextJournal.memory === "string" && nextJournal.memory.trim()
          ? nextJournal.memory.trim()
          : null,
    };

    // Show the saved page immediately — don't wait for refresh
    applyJournalLocally(dayIndex, optimistic, options?.revealSaved);

    try {
      const date =
        dayDate || days[dayIndex]?.date || initialDays[dayIndex]?.date;
      if (!date) throw new Error("Day not found");

      const res = await fetch(`/api/trips/${tripId}/journal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayIndex,
          date,
          journal: {
            photos: photoUrls,
            memory: optimistic.memory,
            mood: optimistic.mood ?? null,
            rating: optimistic.rating ?? null,
            places: (optimistic.places ?? []).map((place) => ({
              id: place.id.startsWith("place-") ? undefined : place.id,
              name: place.name,
              note: place.note,
              lat: place.lat,
              lng: place.lng,
            })),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const details = Array.isArray(json.errors)
          ? ` (${json.errors.join(", ")})`
          : "";
        throw new Error(
          `${json.message || "Could not save journal"}${details}`
        );
      }

      const savedJournal = json.data?.journal as TripJournalData | undefined;
      const savedDays = (json.data?.days ?? []) as TripDayData[];

      skipNextInitialSync.current = true;

      if (savedDays.length) {
        setDays(savedDays.map((d) => ensureJournal(d)));
        const dayJournal = savedDays[dayIndex]?.journal;
        if (dayIndex === activeDay && dayJournal) {
          setMemoryDraft(dayJournal.memory || "");
          if (options?.revealSaved && dayHasContent(dayJournal)) {
            setEditing(false);
          }
        }
      } else if (savedJournal) {
        applyJournalLocally(dayIndex, savedJournal, options?.revealSaved);
      }

      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save journal");
      // Keep optimistic UI; user can retry
      throw e;
    } finally {
      setPending(false);
    }
  }

  function patchJournal(
    dayIndex: number,
    patch: Partial<TripJournalData>,
    options?: { revealSaved?: boolean }
  ) {
    const current = days[dayIndex];
    if (!current) return;
    const base = ensureJournal(current);
    const journalForDay: TripJournalData = {
      ...base.journal!,
      ...patch,
      photos: patch.photos
        ? photosOf({ ...base.journal!, ...patch })
        : photosOf(base.journal),
    };

    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...ensureJournal(d), journal: journalForDay } : d
      )
    );

    void persistDayJournal(
      dayIndex,
      journalForDay,
      base.date,
      options
    ).catch(() => undefined);
  }

  async function uploadPhotos(dayIndex: number, files: FileList | null) {
    if (!files || files.length === 0 || readOnly || atPhotoLimit) return;
    const current = days[dayIndex];
    if (!current) return;

    setUploading(true);
    setError(null);

    const base = ensureJournal(current);
    const remaining = Math.max(0, 12 - photosOf(base.journal).length);
    const selected = Array.from(files).slice(0, remaining);
    if (selected.length === 0) {
      setUploading(false);
      return;
    }

    const blobUrls = selected.map((file) => URL.createObjectURL(file));

    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const fresh = ensureJournal(d);
        return {
          ...fresh,
          journal: {
            ...fresh.journal!,
            photos: [...photosOf(fresh.journal), ...blobUrls].slice(0, 12),
          },
        };
      })
    );

    try {
      const urls: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/trips/${tripId}/journal/upload`, {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Upload failed");
        }
        const url = String(json.data?.url || "").trim();
        if (!url) throw new Error("Upload failed — no photo URL returned");
        urls.push(url);
      }

      blobUrls.forEach((u) => URL.revokeObjectURL(u));

      const existingPhotos = photosOf(base.journal).filter(
        (p) => !p.startsWith("blob:")
      );
      const snapshot: TripJournalData = {
        photos: [...existingPhotos, ...urls].slice(0, 12),
        memory: memoryDraft.trim() || base.journal!.memory,
        mood: days[dayIndex]?.journal?.mood ?? base.journal!.mood,
        rating: days[dayIndex]?.journal?.rating ?? base.journal!.rating,
        places: days[dayIndex]?.journal?.places ?? base.journal!.places,
      };

      setDays((prev) =>
        prev.map((d, i) =>
          i === dayIndex
            ? { ...ensureJournal(d), journal: { ...ensureJournal(d).journal!, ...snapshot } }
            : d
        )
      );

      await persistDayJournal(dayIndex, snapshot, base.date);
    } catch (e) {
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== dayIndex) return d;
          const fresh = ensureJournal(d);
          return {
            ...fresh,
            journal: {
              ...fresh.journal!,
              photos: photosOf(fresh.journal).filter(
                (p) => !p.startsWith("blob:")
              ),
            },
          };
        })
      );
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function searchPlaces(query: string) {
    if (query.trim().length < 2) {
      setGeoHits([]);
      return;
    }
    setGeoPending(true);
    try {
      const res = await fetch(
        `/api/geo/search?q=${encodeURIComponent(
          destinationLabel ? `${query} ${destinationLabel}` : query
        )}`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setGeoHits((json.data as GeoHit[]) || []);
      } else {
        setGeoHits([]);
      }
    } catch {
      setGeoHits([]);
    } finally {
      setGeoPending(false);
    }
  }

  async function addPlace(hit?: GeoHit) {
    if (!day || readOnly) return;
    const name = (hit?.label || placeDraft).trim();
    if (!name) return;
    let lat = hit?.lat ?? null;
    let lng = hit?.lng ?? null;
    let shortName = hit
      ? hit.label.split(",")[0]!.trim() || name
      : name;

    // Free-text add — resolve coordinates so the pin appears on Visited places
    if (lat == null || lng == null) {
      try {
        setGeoPending(true);
        const res = await fetch(
          `/api/geo/search?q=${encodeURIComponent(
            destinationLabel ? `${shortName} ${destinationLabel}` : shortName
          )}`
        );
        const json = await res.json();
        const first = (json.data as GeoHit[] | undefined)?.[0];
        if (res.ok && json.success && first) {
          lat = first.lat;
          lng = first.lng;
          shortName = first.label.split(",")[0]!.trim() || shortName;
        }
      } catch {
        // Keep place even without coords; visited page will try geocoding later
      } finally {
        setGeoPending(false);
      }
    }

    const places = [
      ...(day.journal?.places ?? []),
      {
        id: `place-new-${Date.now()}`,
        name: shortName,
        note: null,
        lat,
        lng,
      },
    ].slice(0, 20);
    patchJournal(activeDay, { places });
    setPlaceDraft("");
    setGeoHits([]);
  }

  function removePlace(placeId: string) {
    if (!day) return;
    patchJournal(activeDay, {
      places: (day.journal?.places ?? []).filter((p) => p.id !== placeId),
    });
  }

  function removePhoto(url: string) {
    if (!day) return;
    patchJournal(activeDay, {
      photos: photos.filter((p) => p !== url),
    });
  }

  function saveDay() {
    if (!day?.journal || readOnly) return;
    const memory = memoryDraft.trim() || null;
    const snapshot: TripJournalData = {
      photos: photosOf(day.journal),
      memory,
      mood: day.journal.mood ?? null,
      rating: day.journal.rating ?? null,
      places: day.journal.places ?? [],
    };
    void persistDayJournal(activeDay, snapshot, day.date, {
      revealSaved: true,
    }).catch(() => undefined);
  }

  if (!day || !journal) {
    return (
      <p className="mt-5 text-sm text-[#67717A]">
        No trip days available for this journal yet.
      </p>
    );
  }

  const mapPlace =
    journal.places.find((p) => p.lat != null && p.lng != null) ?? null;

  return (
    <section
      className={`animate-[tripPop_0.4s_ease-out] overflow-hidden ${
        embedded
          ? "bg-transparent"
          : "rounded-3xl bg-white ring-1 ring-[#e8eef0]"
      }`}
    >
      {!embedded ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#8B5E34] via-[#C48A1A] to-[#E4574A] px-5 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute -top-8 right-4 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-white/75 uppercase">
                Travel journal
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                Daily memories
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Capture each day — then open it like a scrapbook page
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-right backdrop-blur-sm ring-1 ring-white/20">
              <p className="text-[10px] tracking-wide text-white/70 uppercase">
                Pages filled
              </p>
              <p className="font-display text-lg font-semibold">
                {filledDays}/{days.length}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-end justify-between gap-3 px-1">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#8B5E34] uppercase">
            {filledDays}/{days.length} pages inked
          </p>
        </div>
      )}

      <div
        className={`${
          embedded ? "border-y border-[#012A3E]/10" : "border-b border-[#eef2f4]"
        } px-1 py-3 sm:px-0`}
      >
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {days.map((d, index) => {
            const j = ensureJournal(d).journal!;
            const filled = dayHasContent(j);
            const cover = photosOf(j)[0];
            const active = index === activeDay;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => selectDay(index)}
                className={`relative shrink-0 overflow-hidden rounded-2xl text-left transition ${
                  active
                    ? "ring-2 ring-[#C48A1A] ring-offset-2"
                    : "ring-1 ring-[#e4eef0] hover:ring-[#127E83]/40"
                }`}
              >
                <div className="relative h-20 w-[4.5rem] sm:h-24 sm:w-24">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6]">
                      <Camera className="h-5 w-5 text-[#94A3B8]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#012A3E]/85 via-[#012A3E]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-1.5 text-white">
                    <p className="text-[9px] font-semibold tracking-wide uppercase opacity-80">
                      Day {d.dayNumber}
                    </p>
                    <p className="text-[10px] font-semibold leading-tight">
                      {new Date(d.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {filled ? (
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#127E83] text-white shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`space-y-5 py-5 ${embedded ? "px-1" : "px-4 sm:px-6"}`}>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {savedFlash ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7F7] px-3 py-1 text-xs font-semibold tracking-wide text-[#127E83] uppercase">
            <Check className="h-3.5 w-3.5" />
            Day saved
          </p>
        ) : null}
        {pending || uploading ? (
          <p className="text-xs text-[#94A3B8]">
            {uploading ? "Uploading photos…" : "Saving…"}
          </p>
        ) : null}

        {saved ? (
          <div className="animate-[tripPop_0.4s_ease-out] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#C48A1A] uppercase">
                  Saved page · {formatDayLabel(day.date)}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-[#012A3E]">
                  Day {day.dayNumber}
                </h3>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#012A3E] px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit day
                </button>
              ) : null}
            </div>

            {photoCount > 0 ? (
              <div
                className={`grid gap-2 ${
                  photoCount === 1
                    ? "grid-cols-1"
                    : photoCount === 2
                      ? "grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {photos.slice(0, 6).map((url, i) => (
                  <div
                    key={url}
                    className={`overflow-hidden rounded-2xl bg-[#e8eef0] ${
                      i === 0 && photoCount > 2
                        ? "col-span-2 aspect-[16/9] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[220px]"
                        : "aspect-[4/3]"
                    }`}
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
            ) : (
              <div className="rounded-2xl bg-white px-5 py-10 text-center ring-1 ring-[#e8eef0]">
                <Sparkles className="mx-auto h-7 w-7 text-[#C48A1A]" />
                <p className="mt-2 text-sm text-[#67717A]">
                  A quiet page — words and places only
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {mood ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#012A3E] px-3 py-1.5 text-xs font-semibold text-white">
                  <span aria-hidden>{mood.emoji}</span>
                  {mood.label}
                </span>
              ) : null}
              {journal.rating ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E8] px-3 py-1.5 text-xs font-semibold text-[#9a6c12] ring-1 ring-[#f0e4c8]">
                  {Array.from({ length: journal.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 fill-[#C48A1A] text-[#C48A1A]"
                    />
                  ))}
                  {journal.rating}/5
                </span>
              ) : null}
              {journal.places.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7F7] px-3 py-1.5 text-xs font-semibold text-[#127E83]">
                  <MapPin className="h-3.5 w-3.5" />
                  {journal.places.length} place
                  {journal.places.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {journal.memory ? (
              <blockquote className="relative overflow-hidden rounded-3xl bg-white px-5 py-5 ring-1 ring-[#e8eef0]">
                <div className="pointer-events-none absolute -top-4 left-4 font-display text-6xl text-[#127E83]/15">
                  “
                </div>
                <p className="relative whitespace-pre-wrap text-base leading-relaxed text-[#012A3E]">
                  {journal.memory}
                </p>
              </blockquote>
            ) : null}

            {journal.places.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {journal.places.map((place) => (
                    <a
                      key={place.id}
                      href={mapsSearchUrl(place.name, place.lat, place.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF6F7] px-3 py-1.5 text-xs font-semibold text-[#012A3E] ring-1 ring-[#d1e8ea] transition hover:bg-white"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#127E83]" />
                      {place.name}
                      <ExternalLink className="h-3 w-3 text-[#94A3B8]" />
                    </a>
                  ))}
                </div>
                {mapPlace?.lat != null && mapPlace.lng != null ? (
                  <div className="overflow-hidden rounded-2xl ring-1 ring-[#d1e8ea]">
                    <iframe
                      title={`Map · ${mapPlace.name}`}
                      src={mapEmbedSrc(mapPlace.lat, mapPlace.lng)}
                      className="h-48 w-full border-0"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[#94A3B8] uppercase">
                {formatDayLabel(day.date)}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-[#012A3E]">
                Day {day.dayNumber} · write this page
              </h3>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e4eef0]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#127E83] ring-1 ring-[#d1e8ea]">
                    <Camera className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#012A3E]">Photos</p>
                    <p className="text-xs text-[#67717A]">
                      {photoCount}/12 snapshots
                    </p>
                  </div>
                </div>
                {!readOnly ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void uploadPhotos(activeDay, e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading || atPhotoLimit}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#127E83] px-3 py-2 text-xs font-semibold text-white enabled:hover:bg-[#0f6d71] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading
                        ? "Uploading…"
                        : atPhotoLimit
                          ? "Limit reached"
                          : "Add photos"}
                    </button>
                  </>
                ) : null}
              </div>

              {photoCount === 0 ? (
                <button
                  type="button"
                  disabled={readOnly || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 w-full rounded-xl border border-dashed border-[#c9dde0] bg-white/70 px-4 py-8 text-center transition hover:border-[#127E83]/50 hover:bg-white disabled:cursor-default"
                >
                  <Sparkles className="mx-auto h-6 w-6 text-[#127E83]/70" />
                  <p className="mt-2 text-sm text-[#67717A]">
                    Tap to add this day&apos;s favorite frames
                  </p>
                </button>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.map((url) => (
                    <li
                      key={url}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e8eef0]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute top-2 right-2 rounded-lg bg-[#012A3E]/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e4eef0]">
                <p className="text-sm font-semibold text-[#012A3E]">
                  Mood of the day
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MOODS.map((item) => {
                    const active = journal.mood === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          patchJournal(activeDay, {
                            mood: active ? null : item.id,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-[#012A3E] text-white"
                            : "bg-white text-[#67717A] ring-1 ring-[#e8eef0] hover:text-[#012A3E]"
                        }`}
                      >
                        <span aria-hidden>{item.emoji}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-[#FFF8E8] p-4 ring-1 ring-[#f0e4c8]">
                <p className="text-sm font-semibold text-[#012A3E]">Day rating</p>
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = (journal.rating ?? 0) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          patchJournal(activeDay, {
                            rating: journal.rating === value ? null : value,
                          })
                        }
                        className="rounded-lg p-1 transition hover:scale-110"
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        <Star
                          className={`h-7 w-7 ${
                            active
                              ? "fill-[#C48A1A] text-[#C48A1A]"
                              : "text-[#d8c9a8]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e8eef0]">
              <p className="text-sm font-semibold text-[#012A3E]">Memory notes</p>
              <textarea
                value={memoryDraft}
                disabled={readOnly}
                onChange={(e) => setMemoryDraft(e.target.value)}
                rows={4}
                placeholder="What made today special?"
                className="mt-2 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#012A3E] outline-none focus:border-[#127E83]"
              />
            </div>

            <div className="rounded-2xl bg-[#EEF6F7] p-4 ring-1 ring-[#d1e8ea]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#127E83] ring-1 ring-[#d1e8ea]">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#012A3E]">
                    Visited places
                  </p>
                  <p className="text-xs text-[#67717A]">
                    Search & pin spots from today
                  </p>
                </div>
              </div>

              {!readOnly ? (
                <div className="relative mt-3">
                  <div className="flex gap-2">
                    <input
                      value={placeDraft}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlaceDraft(value);
                        void searchPlaces(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addPlace();
                        }
                      }}
                      placeholder="Café, museum, viewpoint…"
                      className="min-w-0 flex-1 rounded-xl border border-[#d1e8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#127E83]"
                    />
                    <button
                      type="button"
                      onClick={() => void addPlace()}
                      disabled={!placeDraft.trim() || geoPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#012A3E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  {geoPending ? (
                    <p className="mt-2 text-xs text-[#94A3B8]">Searching map…</p>
                  ) : null}
                  {geoHits.length > 0 ? (
                    <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-[#e8eef0]">
                      {geoHits.map((hit) => (
                        <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
                          <button
                            type="button"
                            onClick={() => void addPlace(hit)}
                            className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-[#F4FAFB]"
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#127E83]" />
                            <span className="text-[#012A3E]">{hit.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {journal.places.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {journal.places.map((place) => (
                    <li
                      key={place.id}
                      className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e4eef0]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#012A3E]">
                          {place.name}
                        </p>
                        <a
                          href={mapsSearchUrl(place.name, place.lat, place.lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#127E83] hover:underline"
                        >
                          Open map
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => removePlace(place.id)}
                          className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-[#E4574A]"
                          aria-label="Remove place"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {!readOnly ? (
              <div className="sticky bottom-3 z-10">
                <button
                  type="button"
                  disabled={pending || !dayHasContent({
                    ...journal,
                    memory: memoryDraft.trim() || null,
                  })}
                  onClick={saveDay}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#127E83] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(18,126,131,0.35)] transition hover:bg-[#0f6d71] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Save day {day.dayNumber}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
