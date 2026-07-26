import { z } from "zod";
import { objectIdSchema } from "./common";

export const checklistItemSchema = z.object({
  text: z.string().trim().min(1).max(200),
  completed: z.boolean().default(false),
});

export const createChecklistSchema = z.object({
  tripId: objectIdSchema,
  userId: objectIdSchema,
  title: z.string().trim().min(1).max(100),
  items: z.array(checklistItemSchema).default([]),
});

export const updateChecklistSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    items: z.array(checklistItemSchema).optional(),
  })
  .strict();

export const toggleChecklistItemSchema = z.object({
  itemId: objectIdSchema,
  completed: z.boolean(),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type ToggleChecklistItemInput = z.infer<typeof toggleChecklistItemSchema>;
