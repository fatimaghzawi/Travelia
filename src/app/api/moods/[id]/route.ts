import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateMoodSchema } from "@/validators/mood.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { deleteMood, getMoodById, updateMood } from "@/lib/moods/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const mood = await getMoodById(objectIdSchema.parse(id));
  return ok(mood, "Mood");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateMoodSchema.parse(raw);
  const mood = await updateMood(objectIdSchema.parse(id), input);
  return ok(mood, "Mood updated");
});

export const DELETE = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  await deleteMood(objectIdSchema.parse(id));
  return ok(null, "Mood deleted");
});
