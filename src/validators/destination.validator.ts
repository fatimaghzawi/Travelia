import { z } from "zod";
import { objectIdSchema, slugSchema, urlOrPathSchema } from "./common";

export const createDestinationSchema = z.object({
  title: z.string().trim().min(2).max(100),
  slug: slugSchema,
  description: z.string().trim().min(20).max(2000),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  thumbnail: urlOrPathSchema,
  gallery: z.array(z.string().trim().min(1)).default([]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimatedBudget: z.number().min(0),
  recommendedDays: z.number().int().min(1),
  bestSeason: z.string().trim().max(50).optional(),
  capacity: z.number().int().min(1),
  requiresTravelDocuments: z.boolean().default(false),
  visaRequired: z.boolean().default(false),
  visaGuidance: z.string().trim().max(1000).optional().nullable(),
  categoryId: objectIdSchema,
  moodIds: z.array(objectIdSchema).default([]),
  isPublished: z.boolean().default(true),
  createdBy: objectIdSchema,
});

export const updateDestinationSchema = createDestinationSchema
  .omit({ createdBy: true })
  .partial()
  .strict();

export const destinationQuerySchema = z.object({
  country: z.string().trim().optional(),
  city: z.string().trim().optional(),
  categoryId: objectIdSchema.optional(),
  moodId: objectIdSchema.optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDays: z.coerce.number().int().min(1).optional(),
  maxDays: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().max(200).optional(),
  isPublished: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;
export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;
export type DestinationQueryInput = z.infer<typeof destinationQuerySchema>;
