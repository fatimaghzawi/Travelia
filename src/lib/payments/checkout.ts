import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Booking, Payment } from "@/models";
import { getStripe, toStripeAmount } from "@/lib/stripe";

/**
 * Create (or resume) a Stripe checkout session for a single existing
 * booking. Mirrors the previous inline POST /api/payments/checkout logic.
 */
export async function createBookingCheckout(sessionUser: {
  id: string;
  email?: string | null;
}, bookingId: string) {
  await connectDB();

  const booking = await Booking.findById(bookingId).populate(
    "destinationId",
    "title"
  );
  if (!booking) throw new AppError("Booking not found", 404, "NOT_FOUND");
  if (String(booking.userId) !== sessionUser.id) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  if (booking.status === "cancelled") {
    throw new AppError("Booking is cancelled", 400, "BOOKING_CANCELLED");
  }
  if (booking.paymentStatus === "paid") {
    throw new AppError("Booking is already paid", 400, "ALREADY_PAID");
  }
  if (!["pending", "failed"].includes(booking.paymentStatus)) {
    throw new AppError("Booking is not payable", 400, "NOT_PAYABLE");
  }
  if (booking.price <= 0) {
    throw new AppError("Booking has no payable amount", 400, "INVALID_AMOUNT");
  }

  let payment = await Payment.findOne({
    bookingId: booking._id,
    provider: "stripe",
    status: { $in: ["pending", "processing", "failed"] },
  }).sort("-createdAt");

  if (!payment) {
    payment = await Payment.create({
      userId: booking.userId,
      bookingId: booking._id,
      bookingIds: [booking._id],
      amount: booking.price,
      currency: booking.currency || "USD",
      paymentMethod: "card",
      status: "processing",
      provider: "stripe",
    });
  } else {
    // Invalidate previous open Stripe session so retries cannot double-charge
    if (payment.transactionId) {
      try {
        await getStripe().checkout.sessions.expire(payment.transactionId);
      } catch {
        // Already expired/complete — safe to continue
      }
    }
    payment.status = "processing";
    payment.failureReason = null;
    if (!payment.bookingIds?.length) {
      payment.bookingIds = [booking._id];
    }
    await payment.save();
  }

  if (booking.paymentStatus === "failed") {
    booking.paymentStatus = "pending";
    await booking.save();
  }

  const destinationTitle =
    booking.destinationId &&
    typeof booking.destinationId === "object" &&
    "title" in booking.destinationId
      ? String((booking.destinationId as { title?: string }).title)
      : "Travelia booking";

  const metadata = {
    bookingId: String(booking._id),
    paymentId: String(payment._id),
    userId: sessionUser.id,
  };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    redirect_on_completion: "never",
    client_reference_id: String(booking._id),
    customer_email: sessionUser.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (booking.currency || "USD").toLowerCase(),
          unit_amount: toStripeAmount(booking.price),
          product_data: {
            name: destinationTitle,
            description: `Booking ${String(booking._id)}`,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
  });

  if (!session.client_secret) {
    throw new AppError("Failed to create checkout session", 500, "STRIPE_ERROR");
  }

  payment.transactionId = session.id;
  await payment.save();

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}
