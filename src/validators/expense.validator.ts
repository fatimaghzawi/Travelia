import { z } from "zod";
import { currencySchema, dateSchema, objectIdSchema } from "./common";

export const expenseCategorySchema = z.enum([
  "hotel",
  "food",
  "transport",
  "shopping",
  "activities",
  "flight",
  "other",
]);

export const createExpenseSchema = z.object({
  tripId: objectIdSchema,
  userId: objectIdSchema,
  category: expenseCategorySchema,
  title: z.string().trim().min(1).max(100),
  amount: z.number().min(0),
  currency: currencySchema,
  date: dateSchema.default(() => new Date()),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateExpenseSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    title: z.string().trim().min(1).max(100).optional(),
    amount: z.number().min(0).optional(),
    currency: currencySchema.optional(),
    date: dateSchema.optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
