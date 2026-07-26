import { z } from "zod";
import { dateSchema, objectIdSchema, optionalObjectIdSchema } from "./common";

export const createVisitedPlaceSchema = z.object({
  userId: objectIdSchema,
  destinationId: objectIdSchema,
  tripId: optionalObjectIdSchema,
  visitDate: dateSchema,
  rating: z.number().int().min(1).max(5).optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const updateVisitedPlaceSchema = z
  .object({
    tripId: optionalObjectIdSchema,
    visitDate: dateSchema.optional(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export type CreateVisitedPlaceInput = z.infer<typeof createVisitedPlaceSchema>;
export type UpdateVisitedPlaceInput = z.infer<typeof updateVisitedPlaceSchema>;
