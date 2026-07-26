import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { createMoodSchema } from "@/validators/mood.validator";
import { paginationSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { createMood, listMoods } from "@/lib/moods/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  const query = paginationSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  const { items, total } = await listMoods(query);
  return ok(items, "Moods", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createMoodSchema.parse(raw);
  const mood = await createMood(input);
  return ok(mood, "Mood created");
});
