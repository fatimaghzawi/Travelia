import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Notification } from "@/models";
import { ROLES } from "@/lib/constants/roles";
import type { UpdateNotificationInput } from "@/validators/notification.validator";

export type ListNotificationsParams = {
  sessionUserId: string;
  isAdminScope: boolean;
  page: number;
  limit: number;
  type?: string;
  userId?: string;
  isRead?: string;
};

export async function listNotifications(params: ListNotificationsParams) {
  await connectDB();
  const filter: Record<string, unknown> = {};

  if (params.isAdminScope) {
    if (params.type) filter.type = params.type;
    if (params.userId) filter.userId = params.userId;
    if (params.isRead === "true") filter.isRead = true;
    if (params.isRead === "false") filter.isRead = false;
  } else {
    filter.userId = params.sessionUserId;
    if (params.type) filter.type = params.type;
    if (params.isRead === "true") filter.isRead = true;
    if (params.isRead === "false") filter.isRead = false;
  }

  const findQuery = Notification.find(filter)
    .sort("-createdAt")
    .skip((params.page - 1) * params.limit)
    .limit(params.limit);

  if (params.isAdminScope) {
    findQuery.populate("userId", "firstName lastName email");
  }

  const [items, total, unreadCount] = await Promise.all([
    findQuery.lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments(
      params.isAdminScope
        ? { ...filter, isRead: false }
        : { userId: params.sessionUserId, isRead: false }
    ),
  ]);

  return { items, total, unreadCount };
}

export async function getNotificationForActor(
  notificationId: string,
  actor: { id: string; role: string }
) {
  await connectDB();
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new AppError("Notification not found", 404, "NOT_FOUND");
  }

  const isOwner = String(notification.userId) === actor.id;
  const isAdmin = actor.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  return { notification, isOwner, isAdmin };
}

export async function updateNotification(
  notificationId: string,
  actor: { id: string; role: string },
  input: UpdateNotificationInput
) {
  const { notification, isAdmin } = await getNotificationForActor(
    notificationId,
    actor
  );

  if (input.isRead !== undefined) notification.isRead = input.isRead;
  if (isAdmin) {
    if (input.title !== undefined) notification.title = input.title;
    if (input.message !== undefined) notification.message = input.message;
    if (input.link !== undefined) notification.link = input.link;
    if (input.expiresAt !== undefined) notification.expiresAt = input.expiresAt;
  }

  await notification.save();
  return notification;
}

/**
 * Finds a notification for a delete request. Non-owners must be verified as
 * admin by the caller (route) before calling `deleteNotification`.
 */
export async function findNotificationForDelete(
  notificationId: string,
  userId: string
) {
  await connectDB();
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new AppError("Notification not found", 404, "NOT_FOUND");
  }

  return { notification, isOwner: String(notification.userId) === userId };
}

export async function deleteNotification(notification: {
  deleteOne: () => Promise<unknown>;
}) {
  await notification.deleteOne();
}

export async function markAllNotificationsRead(userId: string) {
  await connectDB();
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { modifiedCount: result.modifiedCount };
}
