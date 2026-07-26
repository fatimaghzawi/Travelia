import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import { updateTripSchema } from "@/validators/trip.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { getTripDetail, updateTripAsTraveler } from "@/lib/trips/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const trip = await getTripDetail(user.id, tripId);

  return ok(trip, "Trip");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = updateTripSchema.parse(raw);

  const trip = await updateTripAsTraveler(user.id, tripId, input);

  return ok(trip, "Trip updated");
});
