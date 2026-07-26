import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import {
  createDestinationSchema,
  destinationQuerySchema,
} from "@/validators/destination.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { auth } from "@/auth";
import {
  createDestination,
  listDestinationsForApi,
} from "@/lib/destinations/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  const query = destinationQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === "ADMIN";

  const { items, total } = await listDestinationsForApi(query, { isAdmin });

  return ok(items, "Destinations", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createDestinationSchema.parse({ ...raw, createdBy: session.id });

  const destination = await createDestination(input);
  return ok(destination, "Destination created");
});
