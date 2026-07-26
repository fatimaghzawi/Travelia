import type { NextRequest } from "next/server";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export const GET = apiHandler(async (request: NextRequest) => {
  await requireTraveler();
  const parsed = querySchema.parse({
    q: request.nextUrl.searchParams.get("q") || "",
  });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", parsed.q);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "TraveliaTripJournal/1.0 (traveler itinerary)",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new AppError("Map search unavailable right now", 502, "GEO_ERROR");
  }

  const raw = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  const results = raw
    .map((row) => ({
      label: row.display_name || parsed.q,
      lat: Number(row.lat),
      lng: Number(row.lon),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lng) &&
        row.label.length > 0
    );

  return ok(results, "Places");
});
