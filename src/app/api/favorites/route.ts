import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { buildMeta } from "@/lib/api/pagination";
import { listFavorites, toggleFavorite } from "@/lib/favorites/queries";
import { objectIdSchema, paginationSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireTraveler } from "@/lib/auth/session";
import { z } from "zod";

const toggleFavoriteSchema = z.object({
  destinationId: objectIdSchema,
});

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireTraveler();
  const query = paginationSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const { items, total } = await listFavorites({
    userId: user.id,
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Favorites", buildMeta(total, query.page, query.limit));
});

/** Toggle favorite — creates if missing, removes if present. */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireTraveler();
  const raw = sanitizeInput(await request.json());
  const { destinationId } = toggleFavoriteSchema.parse(raw);

  const result = await toggleFavorite(user.id, destinationId);

  return ok(
    result,
    result.favorited ? "Saved to favorites" : "Removed from favorites"
  );
});
