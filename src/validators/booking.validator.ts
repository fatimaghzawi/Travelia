import { z } from "zod";
import {
  currencySchema,
  dateSchema,
  objectIdSchema,
  optionalObjectIdSchema,
} from "./common";
import { passportSchema } from "./user.validator";

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookingPaymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const createBookingSchema = z
  .object({
    userId: objectIdSchema,
    destinationId: objectIdSchema,
    // null/omitted = destination seat; set = activity seat (still 1 person)
    activityId: optionalObjectIdSchema,
    tripId: optionalObjectIdSchema,
    travelDate: dateSchema,
    price: z.number().min(0),
    currency: currencySchema,
    /**
     * No admin approval per booking.
     * pending = payment/processing; confirmed = seat reserved for verified user.
     */
    status: bookingStatusSchema.default("pending"),
    paymentStatus: bookingPaymentStatusSchema.default("pending"),
    /** Confirm checkbox: use my verified passport details from profile. */
    usePassportDetails: z.boolean().default(false),
    /**
     * Optional snapshot; API should copy from User.passport when
     * user.isVerified && usePassportDetails.
     */
    travelerPassport: passportSchema.optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.usePassportDetails && data.travelerPassport) {
      ctx.addIssue({
        code: "custom",
        message: "travelerPassport requires usePassportDetails to be true",
        path: ["travelerPassport"],
      });
    }
  });

/**
 * Service-layer rules (enforce in booking API, not Zod alone):
 * 1. User must be isVerified === true (admin approved passport once).
 * 2. User.passport must exist.
 * 3. If destination.requiresTravelDocuments → usePassportDetails must be true.
 * 4. Do NOT wait for admin on each booking.
 */
export const updateBookingSchema = z
  .object({
    activityId: optionalObjectIdSchema,
    tripId: optionalObjectIdSchema,
    travelDate: dateSchema.optional(),
    price: z.number().min(0).optional(),
    currency: currencySchema.optional(),
    status: bookingStatusSchema.optional(),
    paymentStatus: bookingPaymentStatusSchema.optional(),
    usePassportDetails: z.boolean().optional(),
    travelerPassport: passportSchema.optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
