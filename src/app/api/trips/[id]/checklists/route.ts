import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import { checklistItemSchema } from "@/validators/checklist.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import {
  createChecklistForTrip,
  listChecklistsForTrip,
} from "@/lib/checklists/queries";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const createBodySchema = z.object({
  title: z.string().trim().min(1).max(100).default("Travel checklist"),
  items: z.array(checklistItemSchema).default([]),
});

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const checklists = await listChecklistsForTrip(tripId, user.id);
  return ok(checklists, "Checklists");
});

export const POST = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = createBodySchema.parse(raw);

  const checklist = await createChecklistForTrip(tripId, user.id, input);
  return ok(checklist, "Checklist created");
});
