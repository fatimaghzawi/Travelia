import { z } from "zod";
import { objectIdSchema } from "./common";

export const createFavoriteSchema = z.object({
  userId: objectIdSchema,
  destinationId: objectIdSchema,
});

export const favoriteParamsSchema = z.object({
  userId: objectIdSchema,
  destinationId: objectIdSchema,
});

export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
