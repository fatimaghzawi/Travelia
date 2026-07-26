import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { createAnnouncementSchema } from "@/validators/announcement.validator";
import { paginationSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { dispatchAnnouncementIfNeeded } from "@/lib/announcements/dispatch";
import { createAnnouncement, listAnnouncements } from "@/lib/announcements/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const query = paginationSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const { items, total } = await listAnnouncements({
    page: query.page,
    limit: query.limit,
  });

  return ok(items, "Announcements", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createAnnouncementSchema.parse(raw);

  const announcement = await createAnnouncement(input, session.id);
  await dispatchAnnouncementIfNeeded(announcement);

  return ok(announcement, "Advertisement published");
});
