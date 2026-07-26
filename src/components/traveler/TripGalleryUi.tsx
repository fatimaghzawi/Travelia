"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Frame,
  Images,
  LayoutGrid,
  List,
  Share2,
  X,
} from "lucide-react";
import type { GalleryPhoto } from "@/lib/trips/gallery";
import {
  composeFramedPhoto,
  downloadBlob,
  frameMetaFromPhoto,
  GALLERY_FRAMES,
  shareFramedBlob,
  suggestFrameForDestination,
  type GalleryFrameId,
} from "@/lib/trips/gallery-frame";

type TripGalleryUiProps = {
  photos: GalleryPhoto[];
};

type ViewMode = "grid" | "list";

function placeLine(photo: GalleryPhoto) {
  if (photo.city && photo.country) return `${photo.city}, ${photo.country}`;
  if (photo.city) return photo.city;
  if (photo.destinationTitle) return photo.destinationTitle;
  if (photo.country) return photo.country;
  return null;
}

export function TripGalleryUi({ photos }: TripGalleryUiProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [frame, setFrame] = useState<GalleryFrameId>("fieldnote");
  const [studioOpen, setStudioOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const trips = useMemo(() => {
    const map = new Map<string, string>();
    for (const photo of photos) {
      map.set(photo.tripId, photo.tripTitle);
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [photos]);

  const visible = useMemo(() => {
    if (tripFilter === "all") return photos;
    return photos.filter((p) => p.tripId === tripFilter);
  }, [photos, tripFilter]);

  const active = visible.find((p) => p.id === activeId) ?? null;
  const activeIndex = active
    ? visible.findIndex((p) => p.id === active.id)
    : -1;

  function goNext() {
    if (activeIndex < 0 || visible.length === 0) return;
    const next = visible[(activeIndex + 1) % visible.length];
    if (next) setActiveId(next.id);
  }

  function goPrev() {
    if (activeIndex < 0 || visible.length === 0) return;
    const prev =
      visible[(activeIndex - 1 + visible.length) % visible.length];
    if (prev) setActiveId(prev.id);
  }

  // Suggest a destination-matched frame when opening studio for a photo
  useEffect(() => {
    if (!active || !studioOpen) return;
    setFrame(
      suggestFrameForDestination(
        active.categorySlug,
        active.city,
        active.country
      )
    );
  }, [active?.id, studioOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) {
      setStudioOpen(false);
      setStatus(null);
    }
  }, [active]);

  useEffect(() => {
    if (!studioOpen || !active) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    setBusy(true);
    setStatus(null);

    void (async () => {
      try {
        const blob = await composeFramedPhoto(
          active.url,
          frame,
          active.tripTitle,
          frameMetaFromPhoto(active)
        );
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        if (!cancelled) setStatus("Could not build framed preview");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studioOpen, active, frame]);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (studioOpen) setStudioOpen(false);
        else setActiveId(null);
      }
      if (!studioOpen && e.key === "ArrowRight") goNext();
      if (!studioOpen && e.key === "ArrowLeft") goPrev();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeIndex, visible, studioOpen]);

  async function handleDownload() {
    if (!active) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await composeFramedPhoto(
        active.url,
        frame,
        active.tripTitle,
        frameMetaFromPhoto(active)
      );
      const place = (active.city || active.destinationTitle || "trip")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      downloadBlob(blob, `travelia-${place}-${frame}.jpg`);
      setStatus("Saved to your device");
    } catch {
      setStatus("Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!active) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await composeFramedPhoto(
        active.url,
        frame,
        active.tripTitle,
        frameMetaFromPhoto(active)
      );
      const place = (active.city || active.destinationTitle || "trip")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const shareTitle = placeLine(active)
        ? `${active.tripTitle} · ${placeLine(active)}`
        : active.tripTitle;
      const result = await shareFramedBlob(
        blob,
        `travelia-${place}-${frame}.jpg`,
        shareTitle
      );
      setStatus(
        result === "shared"
          ? "Opened share sheet — pick WhatsApp, Instagram, or another app"
          : "Downloaded — share the file from your device"
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus(null);
      } else {
        setStatus("Share unavailable — try Download instead");
      }
    } finally {
      setBusy(false);
    }
  }

  const lightbox =
    mounted && active
      ? createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-0 sm:p-4"
            role="presentation"
            onClick={() => {
              if (studioOpen) setStudioOpen(false);
              else setActiveId(null);
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (studioOpen) setStudioOpen(false);
                else setActiveId(null);
              }}
              className="absolute top-3 right-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!studioOpen && visible.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute top-1/2 left-2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:inline-flex sm:h-11 sm:w-11 sm:left-4"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute top-1/2 right-2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:inline-flex sm:h-11 sm:w-11 sm:right-4"
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            ) : null}

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative flex h-full w-full max-w-6xl flex-col justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex max-h-[70dvh] w-full items-center justify-center px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={studioOpen && previewUrl ? previewUrl : active.url}
                  alt=""
                  className={`max-h-[70dvh] w-auto max-w-full object-contain transition ${
                    studioOpen && frame !== "none"
                      ? "shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                      : ""
                  } ${busy && studioOpen ? "opacity-60" : ""}`}
                />
              </div>

              <div className="mt-4 space-y-3 px-4 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3 text-white">
                  <div className="min-w-0">
                    <p id={titleId} className="truncate text-sm font-semibold">
                      {active.tripTitle}
                    </p>
                    <p className="truncate text-xs text-white/65">
                      {[
                        placeLine(active),
                        active.dayLabel,
                        `${activeIndex + 1} of ${visible.length}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudioOpen((open) => !open)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        studioOpen
                          ? "bg-white text-[#012A3E]"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      <Frame className="h-3.5 w-3.5" />
                      {studioOpen ? "Close studio" : "Frame & share"}
                    </button>
                    <Link
                      href={`/dashboard/trips/${active.tripId}`}
                      className="text-xs font-semibold text-[#9aebed] hover:underline"
                    >
                      Open trip
                    </Link>
                  </div>
                </div>

                {studioOpen ? (
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:p-4">
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase">
                      Choose a frame
                      {placeLine(active)
                        ? ` — includes ${placeLine(active)} + Travelia`
                        : " — Travelia branded"}
                    </p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {GALLERY_FRAMES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFrame(item.id)}
                          className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition ${
                            frame === item.id
                              ? "bg-white text-[#012A3E]"
                              : "bg-white/10 text-white/85 hover:bg-white/20"
                          }`}
                          title={item.hint}
                        >
                          <span
                            className="h-8 w-8 rounded-md ring-1 ring-white/30"
                            style={{ background: item.swatch }}
                          />
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleShare()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#127E83] px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDownload()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-60"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                      Framed exports add a Travelia mark and the destination
                      badge for this trip. Clean leaves the photo unchanged.
                    </p>
                    {status ? (
                      <p className="mt-1.5 text-[11px] font-medium text-[#9aebed]">
                        {status}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="trips-list">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#012A3E]">
            Gallery
          </h1>
          <p className="mt-1 text-sm text-[#67717A]">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
            {trips.length > 0
              ? ` · ${trips.length} trip${trips.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        {photos.length > 0 ? (
          <div
            className="inline-flex rounded-xl border border-[#e8eef0] bg-white p-1"
            role="group"
            aria-label="Gallery layout"
          >
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === "grid"
                  ? "bg-[#012A3E] text-white"
                  : "text-[#67717A] hover:text-[#012A3E]"
              }`}
              aria-pressed={view === "grid"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === "list"
                  ? "bg-[#012A3E] text-white"
                  : "text-[#67717A] hover:text-[#012A3E]"
              }`}
              aria-pressed={view === "list"}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        ) : null}
      </header>

      {photos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d1e8ea] bg-white px-6 py-14 text-center">
          <Images className="mx-auto h-8 w-8 text-[#94A3B8]" />
          <p className="mt-3 text-base font-medium text-[#012A3E]">
            No journal photos yet
          </p>
          <p className="mt-1.5 text-sm text-[#67717A]">
            Upload images in a trip&apos;s travel journal and they will appear
            here.
          </p>
          <Link
            href="/dashboard/trips"
            className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
          >
            Go to trips
          </Link>
        </div>
      ) : (
        <>
          {trips.length > 1 ? (
            <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTripFilter("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tripFilter === "all"
                    ? "bg-[#012A3E] text-white"
                    : "bg-white text-[#67717A] ring-1 ring-[#e8eef0] hover:text-[#012A3E]"
                }`}
              >
                All
              </button>
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setTripFilter(trip.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    tripFilter === trip.id
                      ? "bg-[#012A3E] text-white"
                      : "bg-white text-[#67717A] ring-1 ring-[#e8eef0] hover:text-[#012A3E]"
                  }`}
                >
                  {trip.title}
                </button>
              ))}
            </div>
          ) : null}

          {view === "grid" ? (
            <ul className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
              {visible.map((photo) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(photo.id)}
                    className="group relative aspect-square w-full overflow-hidden bg-[#111]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="truncate text-[11px] font-semibold text-white">
                        {photo.tripTitle}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-5 divide-y divide-[#eef2f4] overflow-hidden rounded-2xl border border-[#e8eef0] bg-white">
              {visible.map((photo) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(photo.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#F8FAFB] sm:gap-4 sm:px-4"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#111] sm:h-20 sm:w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#012A3E]">
                        {photo.tripTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#67717A]">
                        {[placeLine(photo), photo.dayLabel]
                          .filter(Boolean)
                          .join(" · ") || "Journal photo"}
                      </p>
                    </div>
                    <span className="hidden text-xs font-semibold text-[#127E83] sm:inline">
                      View
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {lightbox}
    </div>
  );
}
