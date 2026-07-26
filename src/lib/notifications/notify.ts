import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Notification, User } from "@/models";
import type { NotificationType } from "@/models/notification.model";
import { sendEmail } from "@/lib/email";
import { buildNotificationEmailHtml } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export type NotifyUserInput = {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  relatedId?: string | mongoose.Types.ObjectId | null;
  /** Send email (default true when user has an email). */
  email?: boolean;
  emailSubject?: string;
  ctaLabel?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function absoluteLink(link?: string | null) {
  if (!link) return `${appUrl()}/dashboard/notifications`;
  if (link.startsWith("http")) return link;
  return `${appUrl()}${link.startsWith("/") ? link : `/${link}`}`;
}

/**
 * Create an in-app notification and optionally email the user.
 * Email failures are logged and never throw — the DB notification still lands.
 */
export async function notifyUser(input: NotifyUserInput) {
  await connectDB();

  const userId =
    typeof input.userId === "string"
      ? new mongoose.Types.ObjectId(input.userId)
      : input.userId;

  const relatedId = input.relatedId
    ? typeof input.relatedId === "string"
      ? new mongoose.Types.ObjectId(input.relatedId)
      : input.relatedId
    : null;

  const notification = await Notification.create({
    userId,
    title: input.title.slice(0, 100),
    message: input.message.slice(0, 500),
    type: input.type,
    isRead: false,
    link: input.link ?? null,
    relatedId,
  });

  const shouldEmail = input.email !== false;
  if (shouldEmail) {
    try {
      const user = await User.findById(userId)
        .select("email firstName lastName")
        .lean();
      if (user?.email) {
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          "traveler";
        const ctaUrl = absoluteLink(input.link);
        await sendEmail({
          to: user.email,
          subject: input.emailSubject || input.title,
          html: buildNotificationEmailHtml({
            name,
            title: input.title,
            message: input.message,
            ctaLabel: input.ctaLabel || "Open Travelia",
            ctaUrl,
            type: input.type,
          }),
          text: `${input.title}\n\n${input.message}\n\n${ctaUrl}`,
        });
      }
    } catch (error) {
      logger.error("Notification email failed", {
        userId: String(userId),
        notificationId: String(notification._id),
        error,
      });
    }
  }

  return notification;
}

export type NotifyManyRecipient = {
  userId: string | mongoose.Types.ObjectId;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * Fan-out notifications (announcements). Inserts all rows, then emails in small batches.
 */
export async function notifyMany(
  recipients: NotifyManyRecipient[],
  payload: {
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
    relatedId?: string | mongoose.Types.ObjectId | null;
    email?: boolean;
    emailSubject?: string;
    ctaLabel?: string;
  }
) {
  await connectDB();
  if (recipients.length === 0) return { sent: 0, emailed: 0 };

  const relatedId = payload.relatedId
    ? typeof payload.relatedId === "string"
      ? new mongoose.Types.ObjectId(payload.relatedId)
      : payload.relatedId
    : null;

  const docs = recipients.map((r) => ({
    userId:
      typeof r.userId === "string"
        ? new mongoose.Types.ObjectId(r.userId)
        : r.userId,
    title: payload.title.slice(0, 100),
    message: payload.message.slice(0, 500),
    type: payload.type,
    isRead: false,
    link: payload.link ?? null,
    relatedId,
  }));

  await Notification.insertMany(docs, { ordered: false });

  let emailed = 0;
  if (payload.email !== false) {
    const ctaUrl = absoluteLink(payload.link);
    const subject = payload.emailSubject || payload.title;
    const batchSize = 8;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        chunk.map(async (r) => {
          if (!r.email) return;
          const name =
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
            "traveler";
          await sendEmail({
            to: r.email,
            subject,
            html: buildNotificationEmailHtml({
              name,
              title: payload.title,
              message: payload.message,
              ctaLabel: payload.ctaLabel || "Open Travelia",
              ctaUrl,
              type: payload.type,
            }),
            text: `${payload.title}\n\n${payload.message}\n\n${ctaUrl}`,
          });
          emailed += 1;
        })
      );
      for (const result of results) {
        if (result.status === "rejected") {
          logger.error("Announcement email failed", { error: result.reason });
        }
      }
    }
  }

  return { sent: recipients.length, emailed };
}
