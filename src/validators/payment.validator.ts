import { z } from "zod";
import { currencySchema, dateSchema, objectIdSchema } from "./common";

export const paymentMethodSchema = z.enum([
  "card",
  "paypal",
  "bank_transfer",
  "cash",
]);

export const paymentRecordStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
]);

export const createPaymentSchema = z
  .object({
    userId: objectIdSchema,
    bookingId: objectIdSchema,
    amount: z.number().min(0),
    currency: currencySchema,
    paymentMethod: paymentMethodSchema,
    status: paymentRecordStatusSchema.default("pending"),
    transactionId: z.string().trim().min(1).max(200).optional(),
    provider: z.string().trim().max(100).optional().nullable(),
    paidAt: dateSchema.optional().nullable(),
    failureReason: z.string().trim().max(500).optional().nullable(),
    refundAmount: z.number().min(0).default(0),
    refundDate: dateSchema.optional().nullable(),
  })
  .refine((data) => data.refundAmount <= data.amount, {
    message: "Refund amount cannot exceed payment amount",
    path: ["refundAmount"],
  });

export const updatePaymentSchema = z
  .object({
    status: paymentRecordStatusSchema.optional(),
    transactionId: z.string().trim().min(1).max(200).optional(),
    provider: z.string().trim().max(100).optional().nullable(),
    paidAt: dateSchema.optional().nullable(),
    failureReason: z.string().trim().max(500).optional().nullable(),
    refundAmount: z.number().min(0).optional(),
    refundDate: dateSchema.optional().nullable(),
  })
  .strict();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
