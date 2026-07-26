import { Booking, Payment } from "@/models";
import { releaseSeat } from "@/lib/booking/seats";
import { notifyUser } from "@/lib/notifications/notify";

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

/** Locate the Payment a Stripe webhook event refers to. */
export async function findPaymentForEvent(opts: {
  paymentId?: string | null;
  sessionId?: string | null;
  bookingId?: string | null;
}) {
  if (opts.paymentId) {
    const byId = await Payment.findById(opts.paymentId);
    if (byId) return byId;
  }
  if (opts.sessionId) {
    const bySession = await Payment.findOne({ transactionId: opts.sessionId });
    if (bySession) return bySession;
  }
  if (opts.bookingId) {
    return Payment.findOne({
      $or: [{ bookingId: opts.bookingId }, { bookingIds: opts.bookingId }],
      provider: "stripe",
    }).sort("-createdAt");
  }
  return null;
}

/** Mark a payment failed and release/cancel any still-active linked bookings. */
export async function failAndCancelPayment(
  paymentId: string | null | undefined,
  reason: string
) {
  if (!paymentId) return;
  const payment = await Payment.findById(paymentId);
  if (!payment) return;

  const wasFailed = payment.status === "failed";
  if (payment.status !== "completed" && payment.status !== "refunded") {
    payment.status = "failed";
    payment.failureReason = reason;
    await payment.save();
  }

  for (const id of paymentBookingIds(payment)) {
    const booking = await Booking.findById(id);
    if (!booking) continue;
    if (booking.paymentStatus === "paid") continue;

    const wasActive = ["pending", "confirmed"].includes(booking.status);
    booking.paymentStatus = "failed";
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

  if (!wasFailed && payment.userId) {
    await notifyUser({
      userId: payment.userId,
      title: "Payment failed",
      message:
        "Your payment did not go through and the reservation was released. You can try booking again anytime.",
      type: "booking",
      link: "/dashboard/bookings",
      relatedId: payment._id,
      emailSubject: "Payment failed · Travelia",
      ctaLabel: "View bookings",
    }).catch(() => undefined);
  }
}

/** Mark a payment refunded and cancel/release any still-active linked bookings. */
export async function markRefunded(paymentId: string, refundAmount?: number) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return;

  const already = payment.status === "refunded";
  payment.status = "refunded";
  payment.refundDate = payment.refundDate ?? new Date();
  if (typeof refundAmount === "number") {
    payment.refundAmount = refundAmount / 100;
  } else if (!payment.refundAmount) {
    payment.refundAmount = payment.amount;
  }
  await payment.save();

  for (const id of paymentBookingIds(payment)) {
    const booking = await Booking.findById(id);
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

  if (!already && payment.userId) {
    await notifyUser({
      userId: payment.userId,
      title: "Refund processed",
      message: "A refund for your Travelia booking has been processed.",
      type: "booking",
      link: "/dashboard/bookings",
      relatedId: payment._id,
      emailSubject: "Refund processed · Travelia",
      ctaLabel: "View bookings",
    }).catch(() => undefined);
  }
}
