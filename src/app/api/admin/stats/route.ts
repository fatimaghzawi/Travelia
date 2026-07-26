import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/admin/stats";

export const GET = apiHandler(async () => {
  const admin = await requireAdmin();
  const stats = await getAdminStats(admin.id);
  return ok(stats, "Dashboard stats");
});
