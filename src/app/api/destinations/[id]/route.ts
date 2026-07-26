import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateDestinationSchema } from "@/validators/destination.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants/roles";
import {
  deleteDestination,
  getDestinationByIdForApi,
  updateDestination,
} from "@/lib/destinations/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === ROLES.ADMIN;

  const destination = await getDestinationByIdForApi(objectIdSchema.parse(id), {
    isAdmin,
  });
  return ok(destination, "Destination");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateDestinationSchema.parse(raw);

  const destination = await updateDestination(objectIdSchema.parse(id), input);
  return ok(destination, "Destination updated");
});

export const DELETE = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  await deleteDestination(objectIdSchema.parse(id));
  return ok(null, "Destination deleted");
});
