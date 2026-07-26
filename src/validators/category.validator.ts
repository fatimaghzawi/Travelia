import { z } from "zod";
import { slugSchema } from "./common";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug: slugSchema,
  icon: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
