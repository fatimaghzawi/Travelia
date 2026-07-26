import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { buildMeta } from "@/lib/api/pagination";
import { requireTraveler } from "@/lib/auth/session";
import { paginationSchema } from "@/validators/common";
import { z } from "zod";
import { listMyTrips } from "@/lib/trips/queries";

const tripListQuerySchema = paginationSchema.extend({
  status: z
    .enum(["planning", "upcoming", "ongoing", "completed", "cancelled", "active"])
    .optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireTraveler();

  const query = tripListQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const { items, total } = await listMyTrips(user.id, {
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Trips", buildMeta(total, query.page, query.limit));
});
