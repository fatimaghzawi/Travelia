import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { objectIdSchema } from "@/validators/common";
import { updateNotificationSchema } from "@/validators/notification.validator";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import {
  deleteNotification,
  findNotificationForDelete,
  updateNotification,
} from "@/lib/notifications/queries";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const sessionUser = await requireAuth();
  const { id } = await (context as Ctx).params;
  const notificationId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = updateNotificationSchema.parse(raw);

  const notification = await updateNotification(
    notificationId,
    sessionUser,
    input
  );

  return ok(notification, "Notification updated");
});

export const DELETE = apiHandler(async (_request: NextRequest, context) => {
  const sessionUser = await requireAuth();
  const { id } = await (context as Ctx).params;
  const notificationId = objectIdSchema.parse(id);

  const { notification, isOwner } = await findNotificationForDelete(
    notificationId,
    sessionUser.id
  );

  if (!isOwner) {
    await requireAdmin();
  }

  await deleteNotification(notification);
  return ok(null, "Notification deleted");
});
