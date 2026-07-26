import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { paginationSchema } from "@/validators/common";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { listPayments } from "@/lib/payments/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);

  const { items, total } = await listPayments({
    status: params.status,
    paymentMethod: params.paymentMethod,
    userId: params.userId,
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Payments", buildMeta(total, query.page, query.limit));
});
