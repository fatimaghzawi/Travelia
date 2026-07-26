"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Star } from "lucide-react";
import type { VisitedMapPin } from "@/lib/trips/visited-places";

type VisitedPlacesUiProps = {
  pins: VisitedMapPin[];
};

function formatVisitDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pinIcon(
  kind: VisitedMapPin["kind"],
  active: boolean,
  opts?: { bounce?: boolean; delayMs?: number }
) {
  const fill = kind === "destination" ? "#127E83" : "#C48A1A";
  const size = active ? 18 : 14;
  const ring = active
    ? "0 0 0 4px rgba(18,126,131,0.25)"
    : "0 2px 8px rgba(1,42,62,0.25)";
  const bounceClass = opts?.bounce ? " visited-map-pin-bounce" : "";
  const delay =
    opts?.bounce && opts.delayMs
      ? `animation-delay:${opts.delayMs}ms;`
      : "";
  return L.divIcon({
    className: "visited-map-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="${bounceClass.trim()}" style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2px solid #fff;box-shadow:${ring};${delay}"></span>`,
  });
}

export function VisitedPlacesUi({ pins }: VisitedPlacesUiProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(pins[0]?.id ?? null);
  const [filter, setFilter] = useState<"all" | "destination" | "spot">("all");

  const visible = useMemo(() => {
    if (filter === "all") return pins;
    return pins.filter((p) => p.kind === filter);
  }, [pins, filter]);

  const destinations = pins.filter((p) => p.kind === "destination").length;
  const spots = pins.filter((p) => p.kind === "spot").length;

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    if (visible.length === 0) {
      map.setView([20, 0], 2);
      return;
    }

    const bounds = L.latLngBounds([]);
    visible.forEach((pin, index) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin.kind, false, {
          bounce: true,
          delayMs: Math.min(index, 12) * 70,
        }),
        title: pin.name,
      });
      marker.bindPopup(
        `<strong>${pin.name.replace(/</g, "&lt;")}</strong>${
          pin.subtitle
            ? `<br/><span style="opacity:.75">${pin.subtitle.replace(/</g, "&lt;")}</span>`
            : ""
        }${
          pin.tripTitle
            ? `<br/><span style="opacity:.75">${pin.tripTitle.replace(/</g, "&lt;")}</span>`
            : ""
        }`
      );
      marker.on("click", () => setSelectedId(pin.id));
      marker.addTo(map);
      markersRef.current.set(pin.id, marker);
      bounds.extend([pin.lat, pin.lng]);
    });

    if (visible.length === 1) {
      map.setView([visible[0]!.lat, visible[0]!.lng], 11);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }

    window.setTimeout(() => map.invalidateSize(), 80);
  }, [visible]);

  useEffect(() => {
    for (const pin of visible) {
      const marker = markersRef.current.get(pin.id);
      if (!marker) continue;
      marker.setIcon(pinIcon(pin.kind, pin.id === selectedId));
    }
  }, [selectedId, visible]);

  function focusPin(pin: VisitedMapPin) {
    setSelectedId(pin.id);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 12), {
      duration: 0.65,
    });
    markersRef.current.get(pin.id)?.openPopup();
  }

  return (
    <div className="trips-list">
      <header className="max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
          Visited places
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#67717A] sm:text-base">
          Every destination and journal pin from your trips shows up here — add
          places in a trip&apos;s travel journal and they appear on this map.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#012A3E] px-3 py-1 font-semibold text-white">
            {pins.length} places
          </span>
          <span className="rounded-full bg-[#127E83]/12 px-3 py-1 font-semibold text-[#0f6d71]">
            {destinations} destinations
          </span>
          <span className="rounded-full bg-[#C48A1A]/15 px-3 py-1 font-semibold text-[#9a6c12]">
            {spots} field pins
          </span>
        </div>
      </header>

      {pins.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d1e8ea] bg-white px-6 py-14 text-center">
          <MapPin className="mx-auto h-8 w-8 text-[#94A3B8]" />
          <p className="mt-3 text-base font-medium text-[#012A3E]">
            No visited places yet
          </p>
          <p className="mt-1.5 text-sm text-[#67717A]">
            Complete a trip or pin places in your travel journal to fill this
            map.
          </p>
          <Link
            href="/dashboard/trips"
            className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
          >
            Go to trips
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-2xl border border-[#e8eef0] bg-white shadow-[0_10px_40px_rgba(1,42,62,0.06)]">
            <div
              ref={mapEl}
              className="h-[min(70vh,560px)] w-full min-h-[320px]"
              role="application"
              aria-label="Visited places map"
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-[#e8eef0] px-3 py-2 text-[11px] text-[#67717A]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#127E83]" />
                Destination
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C48A1A]" />
                Journal pin
              </span>
              <span className="ml-auto inline-flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                Pan, zoom, and tap markers
              </span>
            </div>
          </div>

          <aside className="flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-[#e8eef0] bg-white">
            <div className="flex gap-1 border-b border-[#e8eef0] p-2">
              {(
                [
                  ["all", "All"],
                  ["destination", "Destinations"],
                  ["spot", "Pins"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                    filter === id
                      ? "bg-[#012A3E] text-white"
                      : "text-[#67717A] hover:bg-[#F4FAFB] hover:text-[#012A3E]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {visible.map((pin) => {
                const active = pin.id === selectedId;
                const dateLabel = formatVisitDate(pin.visitDate);
                return (
                  <li key={pin.id}>
                    <div
                      className={`flex w-full gap-3 rounded-xl px-2.5 py-2.5 transition ${
                        active
                          ? "bg-[#012A3E] text-white"
                          : "hover:bg-[#F4FAFB]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => focusPin(pin)}
                        className="flex min-w-0 flex-1 gap-3 text-left"
                      >
                        <div
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            pin.kind === "destination"
                              ? "bg-[#127E83]"
                              : "bg-[#C48A1A]"
                          } ${active ? "ring-2 ring-white/50" : ""}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${
                              active ? "text-white" : "text-[#012A3E]"
                            }`}
                          >
                            {pin.name}
                          </p>
                          <p
                            className={`truncate text-xs ${
                              active ? "text-white/70" : "text-[#67717A]"
                            }`}
                          >
                            {[pin.subtitle, pin.tripTitle]
                              .filter(Boolean)
                              .join(" · ") || "Visited place"}
                          </p>
                          <div
                            className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${
                              active ? "text-white/60" : "text-[#94A3B8]"
                            }`}
                          >
                            {dateLabel ? <span>{dateLabel}</span> : null}
                            {pin.rating ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-current" />
                                {pin.rating}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                      {pin.tripId ? (
                        <Link
                          href={`/dashboard/trips/${pin.tripId}`}
                          className={`shrink-0 self-center text-[11px] font-semibold ${
                            active
                              ? "text-[#9aebed] hover:underline"
                              : "text-[#127E83] hover:underline"
                          }`}
                        >
                          Trip
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
