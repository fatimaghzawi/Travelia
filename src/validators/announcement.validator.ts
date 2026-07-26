import { z } from "zod";

export const announcementAudienceSchema = z.enum(["all", "TRAVELER", "ADMIN"]);

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(1000),
  audience: announcementAudienceSchema.default("all"),
  isActive: z.boolean().default(true),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().strict();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
