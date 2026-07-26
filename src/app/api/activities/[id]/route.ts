import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateActivitySchema } from "@/validators/activity.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import {
  deleteActivity,
  getActivityById,
  updateActivity,
} from "@/lib/activities/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const activity = await getActivityById(objectIdSchema.parse(id));
  return ok(activity, "Activity");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateActivitySchema.parse(raw);
  const activity = await updateActivity(objectIdSchema.parse(id), input);
  return ok(activity, "Activity updated");
});

export const DELETE = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  await deleteActivity(objectIdSchema.parse(id));
  return ok(null, "Activity deleted");
});
