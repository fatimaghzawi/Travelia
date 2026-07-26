import { Announcement, User } from "@/models";
import type { IAnnouncement } from "@/models/announcement.model";
import { notifyMany } from "@/lib/notifications/notify";

/** Fan out ad notifications once when an announcement becomes active. */
export async function dispatchAnnouncementIfNeeded(
  announcement: IAnnouncement
): Promise<IAnnouncement> {
  if (!announcement.isActive) return announcement;
  if (announcement.sentAt) return announcement;

  const audienceFilter: Record<string, unknown> =
    announcement.audience === "all"
      ? { status: "active" }
      : { status: "active", role: announcement.audience };

  const recipients = await User.find(audienceFilter)
    .select("_id email firstName lastName")
    .lean();

  if (recipients.length > 0) {
    const result = await notifyMany(
      recipients.map((r) => ({
        userId: r._id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
      })),
      {
        emailSubject: `Travelia Ad: ${announcement.title}`,
        ctaLabel: "View ad",
        title: announcement.title,
        message: announcement.message,
        type: "announcement",
        link: "/dashboard",
        relatedId: announcement._id,
      }
    );
    announcement.sentCount = result.sent;
  } else {
    announcement.sentCount = 0;
  }

  announcement.sentAt = new Date();
  await announcement.save();
  return announcement;
}
