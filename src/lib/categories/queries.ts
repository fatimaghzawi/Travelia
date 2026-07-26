import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/handler";
import { Category, Destination } from "@/models";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/validators/category.validator";
import type { PaginationInput } from "@/validators/common";

export async function listCategories(query: PaginationInput) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Category.find(filter)
      .sort(query.sort ?? "name")
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Category.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getCategoryById(id: string) {
  await connectDB();
  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404, "NOT_FOUND");
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  await connectDB();
  return Category.create(input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await connectDB();
  const category = await Category.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!category) throw new AppError("Category not found", 404, "NOT_FOUND");
  return category;
}

export async function deleteCategory(id: string) {
  await connectDB();
  const inUse = await Destination.countDocuments({ categoryId: id });
  if (inUse > 0) {
    throw new AppError(
      `Cannot delete — ${inUse} destination(s) use this category`,
      409,
      "IN_USE"
    );
  }
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new AppError("Category not found", 404, "NOT_FOUND");
  return category;
}
