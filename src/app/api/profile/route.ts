import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { sanitizeInput } from "@/lib/security/sanitize";
import { updateProfileSchema } from "@/validators/user.validator";
import { serializeProfile } from "@/lib/profile/serialize";
import { getProfile, updateProfile } from "@/lib/profile/queries";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";

export const GET = apiHandler(async () => {
  const session = await requireTraveler();
  const user = await getProfile(session.id);
  return ok(serializeProfile(user), "Profile");
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await requireTraveler();
  const raw = sanitizeInput(await request.json());
  const input = updateProfileSchema.parse(raw);

  const { user, emailChanged } = await updateProfile(session.id, input);

  if (emailChanged) {
    const token = await createEmailVerificationToken(user._id);
    await sendVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      token
    );
  }

  return ok(
    {
      ...serializeProfile(user),
      emailVerificationRequired: emailChanged,
    },
    emailChanged
      ? "Profile updated — please verify your new email"
      : "Profile updated"
  );
});
