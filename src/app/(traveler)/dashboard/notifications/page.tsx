import type { Metadata } from "next";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Notification } from "@/models";
import {
  NotificationsUi,
  type InboxNotification,
} from "@/components/traveler/NotificationsUi";

export const metadata: Metadata = {
  title: "Notifications · Travelia",
  description: "Your Travelia inbox — bookings, trips, and announcements.",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/notifications");
  }

  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const [rows, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(80).lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  const items: InboxNotification[] = rows.map((n) => ({
    id: String(n._id),
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: Boolean(n.isRead),
    link: n.link ?? null,
    createdAt: new Date(n.createdAt).toISOString(),
  }));

  return (
    <NotificationsUi initialItems={items} initialUnread={unreadCount} />
  );
}
