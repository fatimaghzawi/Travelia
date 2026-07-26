import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { adminVerifyUserSchema } from "@/validators/user.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { notifyUser } from "@/lib/notifications/notify";
import { verifyUserPassport } from "@/lib/users/queries";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler(async (request: NextRequest, context) => {
  const session = await requireAdmin();
  const { id } = await (context as Ctx).params;

  const raw = sanitizeInput(await request.json());
  const input = adminVerifyUserSchema.parse({ ...raw, userId: id });

  const user = await verifyUserPassport(
    objectIdSchema.parse(id),
    input,
    session.id
  );

  if (input.action === "approve") {
    await notifyUser({
      userId: user._id,
      title: "Passport approved",
      message:
        "Your travel documents are verified. You’re clear to book destinations and journeys on Travelia.",
      type: "verification",
      link: "/destinations",
      relatedId: user._id,
      emailSubject: "Passport approved · Travelia",
      ctaLabel: "Explore destinations",
    }).catch(() => undefined);
  } else {
    await notifyUser({
      userId: user._id,
      title: "Passport needs attention",
      message:
        input.note?.trim() ||
        "Your passport submission was not approved. Please update your documents and try again.",
      type: "verification",
      link: "/dashboard/profile",
      relatedId: user._id,
      emailSubject: "Passport update required · Travelia",
      ctaLabel: "Update profile",
    }).catch(() => undefined);
  }

  return ok(
    user,
    input.action === "approve" ? "Passport approved" : "Passport rejected"
  );
});
