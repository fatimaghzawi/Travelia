import type { NextRequest } from "next/server";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateUserSchema } from "@/validators/user.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import { blockUser, getUser, updateUser } from "@/lib/users/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const session = await requireAuth();
  const { id } = await (context as Ctx).params;
  if (session.role !== ROLES.ADMIN && session.id !== id) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  const user = await getUser(objectIdSchema.parse(id));
  return ok(user, "User");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const admin = await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateUserSchema.parse(raw);

  const user = await updateUser(objectIdSchema.parse(id), input, admin.id);
  return ok(user, "User updated");
});

export const DELETE = apiHandler(async (_request: NextRequest, context) => {
  const session = await requireAdmin();
  const { id } = await (context as Ctx).params;
  if (session.id === id) {
    throw new AppError(
      "You cannot delete your own account",
      400,
      "SELF_DELETE"
    );
  }
  const user = await blockUser(objectIdSchema.parse(id));
  return ok(user, "User blocked");
});
