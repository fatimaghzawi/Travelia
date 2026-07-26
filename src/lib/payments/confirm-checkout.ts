import mongoose from "mongoose";
import type Stripe from "stripe";
import { Booking, Payment } from "@/models";
import { getStripe } from "@/lib/stripe";
import { notifyUser } from "@/lib/notifications/notify";

function paymentBookingIdList(payment: {
  bookingId: unknown;
  bookingIds?: unknown[] | null;
}): mongoose.Types.ObjectId[] {
  const ids = new Set<string>();
  if (payment.bookingId) ids.add(String(payment.bookingId));
  for (const id of payment.bookingIds ?? []) {
    if (id) ids.add(String(id));
  }
  return [...ids]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

export function isCheckoutSessionPaid(session: Stripe.Checkout.Session): boolean {
  return (
    session.payment_status === "paid" || session.status === "complete"
  );
}

/**
 * Mark Payment completed and all linked bookings paid + confirmed.
 * Safe to call multiple times (idempotent).
 */
export async function markPaymentAndBookingsPaid(
  paymentId: string,
  opts?: { amount?: number | null; transactionId?: string | null }
) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return { ok: false as const, reason: "payment_not_found" };

  const alreadyPaid = payment.status === "completed";

  if (opts?.amount != null && opts.amount > 0) {
    if (payment.amount == null || payment.amount <= 0) {
      payment.amount = opts.amount;
    }
  }
  if (opts?.transactionId) {
    payment.transactionId = opts.transactionId;
  }

  payment.status = "completed";
  payment.paidAt = payment.paidAt ?? new Date();
  payment.failureReason = null;
  await payment.save();

  const bookingObjectIds = paymentBookingIdList(payment);
  if (bookingObjectIds.length > 0) {
    await Booking.updateMany(
      {
        _id: { $in: bookingObjectIds },
        status: { $in: ["pending", "confirmed"] },
      },
      {
        $set: {
          paymentStatus: "paid",
          status: "confirmed",
        },
      }
    );
  }

  if (!alreadyPaid && payment.userId) {
    const amountLabel =
      typeof payment.amount === "number" && payment.amount > 0
        ? ` (${payment.currency || "USD"} ${payment.amount.toFixed(2)})`
        : "";
    await notifyUser({
      userId: payment.userId,
      title: "Payment confirmed",
      message: `Your payment${amountLabel} went through and your booking is confirmed. Safe travels!`,
      type: "booking",
      link: "/dashboard/bookings",
      relatedId: payment._id,
      emailSubject: "Payment confirmed · Travelia",
      ctaLabel: "View bookings",
    }).catch(() => undefined);

    // Promote bookings → trips immediately (bypass read-path throttle)
    const { syncTravelerTrips } = await import("@/lib/trips/promote");
    await syncTravelerTrips(String(payment.userId), { force: true }).catch(
      () => undefined
    );
  }

  return {
    ok: true as const,
    paymentId: String(payment._id),
    bookingIds: bookingObjectIds.map(String),
    amount: payment.amount,
  };
}

/**
 * Confirm a Checkout Session with Stripe, with short retries for race timing.
 */
export async function confirmCheckoutSessionById(
  sessionId: string,
  opts?: { expectedUserId?: string }
) {
  const stripe = getStripe();
  let session: Stripe.Checkout.Session | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid" || session.status === "complete") {
      break;
    }
    await new Promise((r) => setTimeout(r, 700));
  }

  if (!session) {
    return { confirmed: false as const, reason: "session_missing" };
  }

  if (
    opts?.expectedUserId &&
    session.metadata?.userId &&
    session.metadata.userId !== opts.expectedUserId
  ) {
    return { confirmed: false as const, reason: "forbidden" };
  }

  if (!isCheckoutSessionPaid(session) && session.status !== "complete") {
    return {
      confirmed: false as const,
      reason: "not_paid",
      paymentStatus: session.payment_status,
      status: session.status,
    };
  }

  const payment =
    (session.metadata?.paymentId
      ? await Payment.findById(session.metadata.paymentId)
      : null) ||
    (await Payment.findOne({ transactionId: session.id }));

  if (!payment) {
    return { confirmed: false as const, reason: "payment_not_found" };
  }

  if (
    opts?.expectedUserId &&
    String(payment.userId) !== opts.expectedUserId
  ) {
    return { confirmed: false as const, reason: "forbidden" };
  }

  // Heal journey payments that only stored bookingId (primary) but Stripe
  // metadata still has the full comma-separated bookingIds list.
  const metaIds = String(session.metadata?.bookingIds || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (metaIds.length > 0) {
    const existing = new Set(
      [
        payment.bookingId ? String(payment.bookingId) : null,
        ...(payment.bookingIds ?? []).map((id) => String(id)),
      ].filter(Boolean) as string[]
    );
    let changed = false;
    for (const id of metaIds) {
      if (existing.has(id)) continue;
      existing.add(id);
      changed = true;
    }
    if (changed || (payment.bookingIds?.length ?? 0) < metaIds.length) {
      payment.bookingIds = [...existing]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      await payment.save();
    }
  }

  const stripeTotal =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : null;

  const result = await markPaymentAndBookingsPaid(String(payment._id), {
    amount: stripeTotal,
    transactionId: session.id,
  });

  if (!result.ok) {
    return { confirmed: false as const, reason: result.reason };
  }

  return {
    confirmed: true as const,
    bookingIds: result.bookingIds,
    amount: result.amount,
    paymentId: result.paymentId,
  };
}
