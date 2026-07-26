"use client";

import { Plane } from "lucide-react";

interface MapDestination {
  id: string;
  title: string;
  city: string;
  country: string;
  bookedCount: number;
  latitude?: number | null;
  longitude?: number | null;
}

// Fallback coordinates for common destinations that don't have lat/long saved yet.
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
};

function resolveCoords(dest: MapDestination): [number, number] | null {
  if (typeof dest.latitude === "number" && typeof dest.longitude === "number") {
    return [dest.latitude, dest.longitude];
  }
  const key = dest.city?.toLowerCase().trim();
  if (key && CITY_FALLBACKS[key]) return CITY_FALLBACKS[key];
  const countryKey = dest.country?.toLowerCase().trim();
  if (countryKey && CITY_FALLBACKS[countryKey]) return CITY_FALLBACKS[countryKey];
  return null;
}

// Equirectangular projection onto an 800x400 viewBox.
function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * 800;
  const y = ((90 - lat) / 180) * 400;
  return [x, y];
}

// Soft, simplified continent silhouettes — decorative, not geographically precise.
const CONTINENT_BLOBS = [
  "M60,120 Q110,90 170,110 Q210,130 190,175 Q170,215 120,210 Q70,205 55,165 Z", // N. America
  "M150,230 Q185,220 200,260 Q210,310 180,345 Q155,360 140,320 Q125,270 150,230 Z", // S. America
  "M380,110 Q420,95 445,115 Q455,140 430,150 Q400,155 385,135 Z", // Europe
  "M390,160 Q440,150 460,200 Q470,250 440,290 Q410,310 395,270 Q380,210 390,160 Z", // Africa
  "M480,100 Q560,80 640,110 Q690,130 670,170 Q620,190 560,175 Q500,160 480,130 Z", // Asia
  "M610,290 Q650,280 670,305 Q675,325 645,330 Q615,325 610,290 Z", // Australia
];

export function WorldMap({ destinations }: { destinations: MapDestination[] }) {
  const pins = destinations
    .map((d) => {
      const coords = resolveCoords(d);
      if (!coords) return null;
      const [x, y] = project(coords[0], coords[1]);
      return { ...d, x, y };
    })
    .filter((p): p is MapDestination & { x: number; y: number } => p !== null);

  const maxBookings = Math.max(1, ...pins.map((p) => p.bookedCount));

  return (
    <div className="relative">
      <svg viewBox="0 0 800 400" className="w-full" role="img" aria-label="Global destinations map">
        <rect x="0" y="0" width="800" height="400" fill="transparent" />
        {CONTINENT_BLOBS.map((d, i) => (
          <path key={i} d={d} fill="var(--color-border)" opacity={0.7} />
        ))}

        {pins.map((pin) => {
          const intensity = 0.4 + 0.6 * (pin.bookedCount / maxBookings);
          return (
            <g key={pin.id}>
              <circle cx={pin.x} cy={pin.y} r={22} fill="var(--color-teal-400)" opacity={0.18 * intensity + 0.08} />
              <circle cx={pin.x} cy={pin.y} r={5} fill="var(--color-teal-600)" stroke="white" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute -translate-x-1/2 -translate-y-full pb-1.5"
            style={{ left: `${(pin.x / 800) * 100}%`, top: `${(pin.y / 400) * 100}%` }}
          >
            <div className="flex flex-col items-center">
              <Plane className="mb-0.5 h-3.5 w-3.5 rotate-45 text-navy-800" />
              <div className="whitespace-nowrap rounded-md bg-surface px-2 py-1 text-center shadow-sm ring-1 ring-border">
                <p className="text-xs font-semibold text-ink">{pin.title || pin.city}</p>
                <p className="text-[11px] text-ink-soft">{pin.bookedCount.toLocaleString()} bookings</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
        <span>Low</span>
        <span className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <span
              key={v}
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--color-teal-500)", opacity: v }}
            />
          ))}
        </span>
        <span>High</span>
      </div>
    </div>
  );
}
