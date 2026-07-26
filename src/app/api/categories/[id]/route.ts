import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateCategorySchema } from "@/validators/category.validator";
import { objectIdSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/lib/categories/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const { id } = await (context as Ctx).params;
  const category = await getCategoryById(objectIdSchema.parse(id));
  return ok(category, "Category");
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  const raw = sanitizeInput(await request.json());
  const input = updateCategorySchema.parse(raw);
  const category = await updateCategory(objectIdSchema.parse(id), input);
  return ok(category, "Category updated");
});

export const DELETE = apiHandler(async (request: NextRequest, context) => {
  await requireAdmin();
  const { id } = await (context as Ctx).params;
  await deleteCategory(objectIdSchema.parse(id));
  return ok(null, "Category deleted");
});
