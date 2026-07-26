import { z } from "zod";
import { objectIdSchema } from "./common";

/** Traveler creates a review after completing a trip to the destination. */
export const travelerCreateReviewSchema = z.object({
  destinationId: objectIdSchema,
  tripId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const travelerUpdateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional().nullable(),
  })
  .strict()
  .refine((v) => v.rating !== undefined || v.comment !== undefined, {
    message: "Provide a rating or comment to update",
  });

/** @deprecated Admin/seed payloads — prefer travelerCreateReviewSchema for app flows. */
export const createReviewSchema = z.object({
  userId: objectIdSchema,
  destinationId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
  images: z.array(z.string().trim().min(1)).default([]),
  isApproved: z.boolean().default(true),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional().nullable(),
    images: z.array(z.string().trim().min(1)).optional(),
    likes: z.number().int().min(0).optional(),
    isApproved: z.boolean().optional(),
  })
  .strict();

export type TravelerCreateReviewInput = z.infer<
  typeof travelerCreateReviewSchema
>;
export type TravelerUpdateReviewInput = z.infer<
  typeof travelerUpdateReviewSchema
>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
