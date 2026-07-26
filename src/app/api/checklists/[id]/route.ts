import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import {
  checklistItemSchema,
  toggleChecklistItemSchema,
} from "@/validators/checklist.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { updateChecklist } from "@/lib/checklists/queries";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const patchBodySchema = z.union([
  toggleChecklistItemSchema,
  z.object({
    title: z.string().trim().min(1).max(100).optional(),
    items: z.array(checklistItemSchema).optional(),
    addItem: z.string().trim().min(1).max(200).optional(),
    removeItemId: objectIdSchema.optional(),
  }),
]);

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const checklistId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = patchBodySchema.parse(raw);

  const checklist = await updateChecklist(checklistId, user.id, input);
  return ok(checklist, "Checklist updated");
});
