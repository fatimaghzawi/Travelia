import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { createCategorySchema } from "@/validators/category.validator";
import { paginationSchema } from "@/validators/common";
import { sanitizeInput } from "@/lib/security/sanitize";
import { requireAdmin } from "@/lib/auth/session";
import { buildMeta } from "@/lib/api/pagination";
import { createCategory, listCategories } from "@/lib/categories/queries";

export const GET = apiHandler(async (request: NextRequest) => {
  const query = paginationSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  const { items, total } = await listCategories(query);
  return ok(items, "Categories", buildMeta(total, query.page, query.limit));
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const raw = sanitizeInput(await request.json());
  const input = createCategorySchema.parse(raw);
  const category = await createCategory(input);
  return ok(category, "Category created");
});
