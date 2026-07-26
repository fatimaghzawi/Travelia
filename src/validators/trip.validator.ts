import { z } from "zod";
import {
  dateSchema,
  objectIdSchema,
  optionalObjectIdSchema,
  urlOrPathSchema,
} from "./common";

export const tripStatusSchema = z.enum([
  "planning",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
]);

export const journalMoodSchema = z.enum([
  "happy",
  "adventurous",
  "relaxed",
  "tired",
  "romantic",
  "amazed",
  "grateful",
]);

export const journalPlaceSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1).max(120),
  note: z.string().trim().max(300).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export const dayJournalSchema = z.object({
  photos: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  memory: z.string().trim().max(2000).optional().nullable(),
  mood: journalMoodSchema.optional().nullable(),
  rating: z
    .union([z.number().int().min(1).max(5), z.null()])
    .optional()
    .nullable(),
  places: z.array(journalPlaceSchema).max(20).default([]),
});

export const itineraryStopSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional().nullable(),
  startTime: z.string().trim().max(10).optional().nullable(),
  reminderAt: dateSchema.optional().nullable(),
  reminderText: z.string().trim().max(200).optional().nullable(),
  completed: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const tripDaySchema = z.object({
  id: z.string().trim().optional(),
  date: dateSchema,
  notes: z.string().trim().max(500).optional().nullable(),
  stops: z.array(itineraryStopSchema).default([]),
  journal: dayJournalSchema.optional().nullable(),
});

export const itineraryUpdateSchema = z.object({
  days: z.array(tripDaySchema).max(60),
});

export const createTripSchema = z
  .object({
    userId: objectIdSchema,
    destinationId: optionalObjectIdSchema,
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    coverImage: urlOrPathSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    status: tripStatusSchema.default("planning"),
    totalBudget: z.number().min(0).default(0),
    estimatedCost: z.number().min(0).default(0),
    days: z.array(tripDaySchema).default([]),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const updateTripSchema = z
  .object({
    destinationId: optionalObjectIdSchema,
    title: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    coverImage: urlOrPathSchema,
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    status: tripStatusSchema.optional(),
    totalBudget: z.number().min(0).optional(),
    estimatedCost: z.number().min(0).optional(),
    days: z.array(tripDaySchema).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type ItineraryUpdateInput = z.infer<typeof itineraryUpdateSchema>;
export type ItineraryStopInput = z.infer<typeof itineraryStopSchema>;
export type TripDayInput = z.infer<typeof tripDaySchema>;
export type DayJournalInput = z.infer<typeof dayJournalSchema>;
