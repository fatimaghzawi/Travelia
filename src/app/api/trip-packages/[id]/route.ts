import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateTripPackageSchema } from "@/validators/trip-package.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants/roles";
import {
  deleteTripPackage,
  getTripPackageById,
  updateTripPackage,
} from "@/lib/trip-packages/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  objectIdSchema.parse(id);

  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === ROLES.ADMIN;

  const tripPackage = await getTripPackageById(id, { isAdmin });

  return ok(tripPackage, "Trip package");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = updateTripPackageSchema.parse(raw);

  const tripPackage = await updateTripPackage(id, input);
  return ok(tripPackage, "Trip package updated");
});

export const DELETE = apiHandler(async (_request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  objectIdSchema.parse(id);

  await deleteTripPackage(id);
  return ok(null, "Trip package deleted");
});
