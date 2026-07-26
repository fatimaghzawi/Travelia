import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { paginationSchema } from "@/validators/common";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import { buildMeta } from "@/lib/api/pagination";
import { listNotifications } from "@/lib/notifications/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  const sessionUser = await requireAuth();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const query = paginationSchema.parse(params);

  const isAdminScope = sessionUser.role === ROLES.ADMIN && params.scope !== "me";
  if (isAdminScope) {
    await requireAdmin();
  }

  const { items, total, unreadCount } = await listNotifications({
    sessionUserId: sessionUser.id,
    isAdminScope,
    page: query.page,
    limit: query.limit,
    type: params.type,
    userId: params.userId,
    isRead: params.isRead,
  });

  return ok(items, "Notifications", {
    ...buildMeta(total, query.page, query.limit),
    unreadCount,
  });
});
