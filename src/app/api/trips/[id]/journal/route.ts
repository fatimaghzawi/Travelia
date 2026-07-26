import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import { dayJournalSchema } from "@/validators/trip.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { saveJournalEntry } from "@/lib/trips/queries";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  dayIndex: z.number().int().min(0).optional(),
  date: z.string().trim().optional(),
  journal: dayJournalSchema,
});

export const PUT = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = bodySchema.parse(raw);

  const result = await saveJournalEntry(user.id, tripId, input);

  return ok(result, "Journal saved");
});
