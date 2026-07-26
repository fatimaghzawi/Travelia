import { z } from "zod";
import {
  dateSchema,
  objectIdSchema,
  optionalObjectIdSchema,
  paginationSchema,
} from "./common";

export const tripPackageStatusSchema = z.enum(["open", "closed", "full"]);

export const createTripPackageSchema = z
  .object({
    destinationId: objectIdSchema,
    title: z.string().trim().max(120).optional().nullable(),
    departureDate: dateSchema,
    returnDate: dateSchema,
    capacity: z.number().int().min(1),
    price: z.number().min(0),
    currency: z.string().trim().length(3).default("USD"),
    guideIncluded: z.boolean().default(false),
    status: tripPackageStatusSchema.default("open"),
    isPublished: z.boolean().default(true),
    notes: z.string().trim().max(500).optional().nullable(),
    createdBy: objectIdSchema,
  })
  .refine((data) => data.returnDate >= data.departureDate, {
    message: "Return date must be on or after departure date",
    path: ["returnDate"],
  });

export const updateTripPackageSchema = z
  .object({
    title: z.string().trim().max(120).optional().nullable(),
    departureDate: dateSchema.optional(),
    returnDate: dateSchema.optional(),
    capacity: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
    guideIncluded: z.boolean().optional(),
    status: tripPackageStatusSchema.optional(),
    isPublished: z.boolean().optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.departureDate && data.returnDate) {
        return data.returnDate >= data.departureDate;
      }
      return true;
    },
    {
      message: "Return date must be on or after departure date",
      path: ["returnDate"],
    }
  );

export const tripPackageQuerySchema = paginationSchema.extend({
  destinationId: optionalObjectIdSchema,
  status: tripPackageStatusSchema.optional(),
  isPublished: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** When true, only open packages with future departure and seats left. */
  bookableOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreateTripPackageInput = z.infer<typeof createTripPackageSchema>;
export type UpdateTripPackageInput = z.infer<typeof updateTripPackageSchema>;
