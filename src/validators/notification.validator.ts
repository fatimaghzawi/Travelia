import { z } from "zod";
import { dateSchema, objectIdSchema, optionalObjectIdSchema } from "./common";

export const notificationTypeSchema = z.enum([
  "booking",
  "trip",
  "reminder",
  "promotion",
  "announcement",
  "verification",
]);

export const createNotificationSchema = z.object({
  userId: objectIdSchema,
  title: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(500),
  type: notificationTypeSchema,
  isRead: z.boolean().default(false),
  link: z.string().trim().max(500).optional().nullable(),
  relatedId: optionalObjectIdSchema,
  expiresAt: dateSchema.optional(),
});

export const updateNotificationSchema = z
  .object({
    isRead: z.boolean().optional(),
    title: z.string().trim().min(1).max(100).optional(),
    message: z.string().trim().min(1).max(500).optional(),
    link: z.string().trim().max(500).optional().nullable(),
    expiresAt: dateSchema.optional(),
  })
  .strict();

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
