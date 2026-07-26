import { z } from "zod";

/** MongoDB ObjectId as a 24-char hex string */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const optionalObjectIdSchema = objectIdSchema.optional().nullable();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(120, "Slug is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens");

export const urlOrPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .optional()
  .nullable();

/** Uploaded image URL or app path (e.g. /uploads/passports/xyz.jpg). */
export const imageUploadSchema = z
  .string()
  .trim()
  .min(1, "Image is required")
  .max(2048)
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      value.startsWith("/") ||
      value.startsWith("uploads/"),
    "Invalid image path or URL"
  );

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, "Currency must be a 3-letter ISO code")
  .default("USD");

export const dateSchema = z.coerce.date({
  error: "Invalid date",
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().trim().optional(),
  search: z.string().trim().max(200).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));
}
