import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { createActivitySchema } from "@/validators/activity.validator";
import { paginationSchema, objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { createActivity, listActivities } from "@/lib/activities/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);
  const destinationId = params.destinationId
    ? objectIdSchema.parse(params.destinationId)
    : undefined;

  const { items, total } = await listActivities({ ...query, destinationId });

  return ok(items, "Activities", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createActivitySchema.parse(raw);
  const activity = await createActivity(input);
  return ok(activity, "Activity created");
});
