import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateAnnouncementSchema } from "@/validators/announcement.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { dispatchAnnouncementIfNeeded } from "@/lib/announcements/dispatch";
import {
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/announcements/queries";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateAnnouncementSchema.parse(raw);

  const announcement = await updateAnnouncement(objectIdSchema.parse(id), input);
  await dispatchAnnouncementIfNeeded(announcement);

  return ok(announcement, "Announcement updated");
});

export const DELETE = apiHandler(async (_request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  await deleteAnnouncement(objectIdSchema.parse(id));
  return ok(null, "Announcement deleted");
});
