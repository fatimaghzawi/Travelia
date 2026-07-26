import { z } from "zod";
import { objectIdSchema, urlOrPathSchema } from "./common";

export const activityCategorySchema = z.enum([
  "adventure",
  "food",
  "culture",
  "nature",
  "shopping",
  "entertainment",
  "sports",
  "relaxation",
  "other",
]);

export const createActivitySchema = z.object({
  destinationId: objectIdSchema,
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(1000),
  duration: z.number().min(0), // minutes
  price: z.number().min(0).default(0),
  location: z.string().trim().max(200).optional(),
  image: urlOrPathSchema,
  category: activityCategorySchema.default("other"),
  openingHours: z.string().trim().max(100).optional().nullable(),
  capacity: z.number().int().min(1),
  isAvailable: z.boolean().default(true),
});

export const updateActivitySchema = createActivitySchema.partial().strict();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
