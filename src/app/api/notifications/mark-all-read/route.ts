import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/notifications/queries";

export const POST = apiHandler(async () => {
  const sessionUser = await requireAuth();
  const { modifiedCount } = await markAllNotificationsRead(sessionUser.id);

  return ok({ modifiedCount }, "All notifications marked as read");
});
