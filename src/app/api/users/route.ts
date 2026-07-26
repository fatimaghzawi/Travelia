import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { createUserSchema } from "@/validators/user.validator";
import { paginationSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { createUser, listUsers } from "@/lib/users/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);

  const { items, total } = await listUsers({
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    search: query.search,
    role: params.role,
    status: params.status,
    verificationStatus: params.verificationStatus,
  });

  return ok(items, "Users", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createUserSchema.parse(raw);

  const user = await createUser(input);
  return ok(user, "User created");
});
