import { z } from "zod";
import { slugSchema } from "./common";

export const createMoodSchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug: slugSchema,
  icon: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateMoodSchema = createMoodSchema.partial().strict();

export type CreateMoodInput = z.infer<typeof createMoodSchema>;
export type UpdateMoodInput = z.infer<typeof updateMoodSchema>;
