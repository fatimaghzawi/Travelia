import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Booking, Payment } from "@/models";
import { releaseSeat } from "@/lib/booking/seats";
import type { UpdatePaymentInput } from "@/validators/payment.validator";

export type PageParams = { page: number; limit: number };

export type PaymentListFilter = {
  status?: string;
  paymentMethod?: string;
  userId?: string;
};

/** Admin payments list. */
export async function listPayments(filter: PaymentListFilter & PageParams) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.paymentMethod) query.paymentMethod = filter.paymentMethod;
  if (filter.userId) query.userId = filter.userId;

  const [items, total] = await Promise.all([
    Payment.find(query)
      .populate("userId", "firstName lastName email")
      .populate("bookingId", "destinationId travelDate")
      .sort("-createdAt")
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit),
    Payment.countDocuments(query),
  ]);

  return { items, total };
}

export async function getPaymentForAdmin(paymentId: string) {
  await connectDB();
  const payment = await Payment.findById(paymentId)
    .populate("userId", "firstName lastName email")
    .populate("bookingId");
  if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
  return payment;
}

function paymentBookingIds(payment: {
  bookingId: unknown;
  bookingIds?: unknown[] | null;
}): string[] {
  const ids = new Set<string>();
  if (payment.bookingId) ids.add(String(payment.bookingId));
  for (const id of payment.bookingIds ?? []) {
    if (id) ids.add(String(id));
  }
  return [...ids];
}

/**
 * Admin edit of a payment record — reconciles linked bookings/seats when
 * status transitions to refunded/completed/failed.
 */
export async function updatePaymentAsAdmin(
  paymentId: string,
  input: UpdatePaymentInput
) {
  await connectDB();
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");

  Object.assign(payment, input);
  if (input.status === "completed" && !payment.paidAt) payment.paidAt = new Date();

  if (input.status === "refunded") {
    payment.refundDate = payment.refundDate ?? new Date();
    payment.refundAmount = input.refundAmount ?? payment.amount;
    for (const bookingId of paymentBookingIds(payment)) {
      const booking = await Booking.findById(bookingId);
      if (!booking) continue;
      booking.paymentStatus = "refunded";
      const wasActive = ["pending", "confirmed"].includes(booking.status);
      if (wasActive) {
        booking.status = "cancelled";
        await booking.save();
        await releaseSeat(
          booking.destinationId.toString(),
          booking.activityId?.toString(),
          booking.tripPackageId?.toString()
        );
      } else {
        await booking.save();
      }
    }
  }

  if (input.status === "completed") {
    for (const bookingId of paymentBookingIds(payment)) {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: "paid",
        status: "confirmed",
      });
    }
  }

  if (input.status === "failed") {
    for (const bookingId of paymentBookingIds(payment)) {
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.paymentStatus === "paid") continue;
      const wasActive = ["pending", "confirmed"].includes(booking.status);
      booking.paymentStatus = "failed";
      if (wasActive && booking.status === "pending") {
        booking.status = "cancelled";
        await booking.save();
        await releaseSeat(
          booking.destinationId.toString(),
          booking.activityId?.toString(),
          booking.tripPackageId?.toString()
        );
      } else {
        await booking.save();
      }
    }
  }

  await payment.save();
  return payment;
}
