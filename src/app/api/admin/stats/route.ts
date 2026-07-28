import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/admin/stats";
import { parseStatsPeriod } from "@/lib/admin/stats-period";

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdmin();
  const period = parseStatsPeriod(
    request.nextUrl.searchParams.get("period")
  );
  const stats = await getAdminStats(admin.id, period);
  return ok(stats, "Dashboard stats");
});
