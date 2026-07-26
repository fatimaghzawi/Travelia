import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import { updatePassportSchema } from "@/validators/user.validator";
import { serializeProfile } from "@/lib/profile/serialize";
import { updatePassport } from "@/lib/profile/queries";
import { notifyUser } from "@/lib/notifications/notify";

export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireTraveler();
  const raw = sanitizeInput(await request.json());
  const passport = updatePassportSchema.parse(raw);

  const user = await updatePassport(session.id, passport);

  await notifyUser({
    userId: user._id,
    title: "Passport under review",
    message:
      "We received your travel documents. An admin will verify them shortly — you’ll get another note when it’s done.",
    type: "verification",
    link: "/dashboard/profile",
    relatedId: user._id,
    emailSubject: "Passport under review · Travelia",
    ctaLabel: "View profile",
  }).catch(() => undefined);

  return ok(serializeProfile(user), "Passport submitted for verification");
});
