"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Globe2, MapPin, Star, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { TravelPrice } from "@/components/traveler/preferences/TravelPrice";

/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet is loaded only on the client via dynamic import */
type LeafletNS = any;
type LeafletMap = any;
type LeafletMarker = any;

type MapDestination = {
  id: string;
  title: string;
  slug?: string;
  city: string;
  country: string;
  thumbnail?: string | null;
  estimatedBudget?: number;
  ratingAverage?: number;
  recommendedDays?: number;
  latitude?: number | null;
  longitude?: number | null;
};

const CITY_FALLBACKS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  tokyo: [35.6762, 139.6503],
  santorini: [36.3932, 25.4615],
  bali: [-8.3405, 115.092],
  london: [51.5072, -0.1276],
  rome: [41.9028, 12.4964],
  dubai: [25.2048, 55.2708],
  "new york": [40.7128, -74.006],
  cairo: [30.0444, 31.2357],
  sydney: [-33.8688, 151.2093],
  bangkok: [13.7563, 100.5018],
  barcelona: [41.3874, 2.1686],
  istanbul: [41.0082, 28.9784],
  maldives: [3.2028, 73.2207],
  beirut: [33.8938, 35.5018],
  amman: [31.9539, 35.9106],
};

function resolveCoords(dest: MapDestination): [number, number] | null {
  if (typeof dest.latitude === "number" && typeof dest.longitude === "number") {
    return [dest.latitude, dest.longitude];
  }
  const key = dest.city?.toLowerCase().trim();
  if (key && CITY_FALLBACKS[key]) return CITY_FALLBACKS[key]!;
  const countryKey = dest.country?.toLowerCase().trim();
  if (countryKey && CITY_FALLBACKS[countryKey]) return CITY_FALLBACKS[countryKey]!;
  return null;
}

function pinIcon(L: LeafletNS, active: boolean) {
  const size = active ? 30 : 24;
  const stroke = active ? "#012A3E" : "#51A5D6";
  const fill = active ? "#51A5D6" : "#ffffff";
  const plane = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
  return L.divIcon({
    className: "dest-map-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;transform:rotate(-40deg);filter:drop-shadow(0 2px 6px rgba(1,42,62,0.35))">${plane}</span>`,
  });
}

function normalizeDestination(raw: Record<string, unknown>): MapDestination {
  const id = String(raw._id ?? raw.id ?? "");
  return {
    id,
    title: String(raw.title ?? "Destination"),
    slug: raw.slug ? String(raw.slug) : undefined,
    city: String(raw.city ?? ""),
    country: String(raw.country ?? ""),
    thumbnail: (raw.thumbnail as string | null | undefined) ?? null,
    estimatedBudget:
      typeof raw.estimatedBudget === "number" ? raw.estimatedBudget : 0,
    ratingAverage:
      typeof raw.ratingAverage === "number" ? raw.ratingAverage : 0,
    recommendedDays:
      typeof raw.recommendedDays === "number" ? raw.recommendedDays : undefined,
    latitude: typeof raw.latitude === "number" ? raw.latitude : null,
    longitude: typeof raw.longitude === "number" ? raw.longitude : null,
  };
}

type DestinationsMapQuickViewProps = {
  open: boolean;
  onClose: () => void;
};

export function DestinationsMapQuickView({
  open,
  onClose,
}: DestinationsMapQuickViewProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const [destinations, setDestinations] = useState<MapDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const pins = useMemo(() => {
    return destinations
      .map((d) => {
        const coords = resolveCoords(d);
        if (!coords) return null;
        return { ...d, lat: coords[0], lng: coords[1] };
      })
      .filter(
        (p): p is MapDestination & { lat: number; lng: number } => p !== null
      );
  }, [destinations]);

  const selected = pins.find((p) => p.id === selectedId) ?? pins[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<Record<string, unknown>[]>(
          "/destinations",
          { limit: 60, page: 1 }
        );
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []).map((row) =>
          normalizeDestination(row)
        );
        setDestinations(list);
        const firstWithCoords = list.find((d) => resolveCoords(d));
        setSelectedId(firstWithCoords?.id ?? null);
      } catch {
        if (!cancelled) setError("Could not load destinations right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mapEl.current) return;
    let cancelled = false;
    const timers: number[] = [];

    function safeInvalidate(map: LeafletMap | null | undefined) {
      if (cancelled || !map) return;
      try {
        // Map may already be removed (close / Strict Mode remount).
        if (!map.getContainer?.() || map._leaflet_id == null) return;
        map.invalidateSize();
      } catch {
        // Ignore Leaflet panes that were torn down mid-timeout.
      }
    }

    async function initMap() {
      const leafletMod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const L = leafletMod.default;
      if (cancelled || !mapEl.current) return;

      leafletRef.current = L;

      if (mapRef.current) {
        timers.push(
          window.setTimeout(() => safeInvalidate(mapRef.current), 60)
        );
        setMapReady(true);
        return;
      }

      // Container may still hold a leftover Leaflet id after a fast remount.
      if ((mapEl.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        try {
          mapEl.current.innerHTML = "";
          delete (mapEl.current as HTMLElement & { _leaflet_id?: number })
            ._leaflet_id;
        } catch {
          // ignore
        }
      }

      const map = L.map(mapEl.current, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([25, 20], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (cancelled) {
        map.remove();
        return;
      }

      mapRef.current = map;
      setMapReady(true);
      timers.push(window.setTimeout(() => safeInvalidate(map), 80));
    }

    void initMap();

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
      setMapReady(false);
      try {
        mapRef.current?.remove();
      } catch {
        // ignore double-remove
      }
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current.clear();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mapReady) return;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    let cancelled = false;
    const timers: number[] = [];

    function safeInvalidate(target: LeafletMap | null | undefined) {
      if (cancelled || !target) return;
      try {
        if (!target.getContainer?.() || target._leaflet_id == null) return;
        target.invalidateSize();
      } catch {
        // ignore
      }
    }

    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    if (pins.length === 0) {
      try {
        map.setView([25, 20], 2);
      } catch {
        // ignore
      }
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(L, false),
        title: pin.title,
      });
      marker.bindPopup(
        `<strong>${pin.title.replace(/</g, "&lt;")}</strong><br/><span style="opacity:.75">${[
          pin.city,
          pin.country,
        ]
          .filter(Boolean)
          .join(", ")
          .replace(/</g, "&lt;")}</span>`
      );
      marker.on("click", () => setSelectedId(pin.id));
      marker.addTo(map);
      markersRef.current.set(pin.id, marker);
      bounds.extend([pin.lat, pin.lng]);
    }

    try {
      if (pins.length === 1) {
        map.setView([pins[0]!.lat, pins[0]!.lng], 6);
      } else {
        map.fitBounds(bounds.pad(0.25));
      }
    } catch {
      // ignore if map was removed mid-update
    }
    timers.push(window.setTimeout(() => safeInvalidate(map), 100));

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [open, pins, mapReady]);

  useEffect(() => {
    if (!open || !mapReady) return;
    const L = leafletRef.current;
    if (!L) return;
    for (const pin of pins) {
      const marker = markersRef.current.get(pin.id);
      if (!marker) continue;
      marker.setIcon(pinIcon(L, pin.id === selectedId));
    }
  }, [open, pins, selectedId, mapReady]);

  function focusPin(id: string) {
    setSelectedId(id);
    const pin = pins.find((p) => p.id === id);
    const map = mapRef.current;
    if (!pin || !map) return;
    try {
      if (!map.getContainer?.() || map._leaflet_id == null) return;
      map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 5), {
        duration: 0.55,
      });
      markersRef.current.get(id)?.openPopup();
    } catch {
      // Map may have been closed while focusing.
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#012A3E]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Destinations map"
        className="flex h-[min(92dvh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_80px_rgba(1,42,62,0.35)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e8eef0] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#51A5D6]/15 text-[#1d6f9a]">
              <Globe2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-[#012A3E]">
                Explore the map
              </p>
              <p className="truncate text-xs text-[#67717A]">
                {loading
                  ? "Loading destinations…"
                  : `${pins.length} destination${pins.length === 1 ? "" : "s"} on the globe`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#67717A] transition hover:bg-[#F4FAFB] hover:text-[#012A3E]"
            aria-label="Close map"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_280px]">
          <div className="relative min-h-[280px] flex-1 bg-[#e8eef0]">
            <div ref={mapEl} className="absolute inset-0 z-0" />
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 text-sm font-medium text-[#012A3E]">
                Charting destinations…
              </div>
            ) : null}
            {error ? (
              <div className="absolute inset-x-4 bottom-4 z-10 rounded-xl bg-white px-3 py-2 text-sm text-[#E4574A] shadow ring-1 ring-[#E4574A]/20">
                {error}
              </div>
            ) : null}
          </div>

          <aside className="flex max-h-[40vh] flex-col border-t border-[#e8eef0] lg:max-h-none lg:border-t-0 lg:border-l">
            {selected ? (
              <div className="border-b border-[#e8eef0] p-4">
                <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-2xl bg-[#e8eef0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.thumbnail || "/images/dest2.jpg"}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <p className="font-display text-xl font-semibold text-[#012A3E]">
                  {selected.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-[#67717A]">
                  <MapPin className="h-3.5 w-3.5 text-[#51A5D6]" />
                  {[selected.city, selected.country].filter(Boolean).join(", ")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#67717A]">
                  {typeof selected.ratingAverage === "number" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#012A3E]">
                      <Star className="h-3.5 w-3.5 fill-[#C48A1A] text-[#C48A1A]" />
                      {selected.ratingAverage.toFixed(1)}
                    </span>
                  ) : null}
                  {typeof selected.estimatedBudget === "number" ? (
                    <span>
                      From <TravelPrice amount={selected.estimatedBudget} />
                    </span>
                  ) : null}
                  {selected.recommendedDays ? (
                    <span>{selected.recommendedDays} days</span>
                  ) : null}
                </div>
                <Link
                  href={`/destinations/${selected.id}`}
                  onClick={onClose}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f6b6f]"
                >
                  Explore destination
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="border-b border-[#e8eef0] p-4 text-sm text-[#67717A]">
                Select a pin to preview a destination.
              </div>
            )}

            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {pins.map((pin) => {
                const active = pin.id === selected?.id;
                return (
                  <li key={pin.id}>
                    <button
                      type="button"
                      onClick={() => focusPin(pin.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-[#51A5D6]/12 ring-1 ring-[#51A5D6]/30"
                          : "hover:bg-[#F4FAFB]"
                      }`}
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#e8eef0]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pin.thumbnail || "/images/dest2.jpg"}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#012A3E]">
                          {pin.title}
                        </span>
                        <span className="block truncate text-xs text-[#67717A]">
                          {[pin.city, pin.country].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {!loading && pins.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-[#67717A]">
                  No mapped destinations yet.
                </li>
              ) : null}
            </ul>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
}
