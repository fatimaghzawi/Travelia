import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import { itineraryUpdateSchema } from "@/validators/trip.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { getItinerary, saveItinerary } from "@/lib/trips/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const itinerary = await getItinerary(user.id, tripId);

  return ok(itinerary, "Itinerary");
});

export const PUT = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = itineraryUpdateSchema.parse(raw);

  const result = await saveItinerary(user.id, tripId, input);

  return ok(result, "Itinerary saved");
});
