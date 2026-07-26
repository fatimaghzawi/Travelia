import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { connectDB } from "@/lib/db/mongoose";
import { getStripe } from "@/lib/stripe";
import { markPaymentAndBookingsPaid } from "@/lib/payments/confirm-checkout";
import {
  failAndCancelPayment,
  findPaymentForEvent,
  markRefunded,
} from "@/lib/payments/webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET missing");
    return new Response("STRIPE_WEBHOOK_SECRET is not configured", {
      status: 500,
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe webhook] signature", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  await connectDB();

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paid =
          session.payment_status === "paid" || session.status === "complete";
        if (!paid) break;

        const payment =
          (await findPaymentForEvent({
            paymentId: session.metadata?.paymentId,
            sessionId: session.id,
            bookingId: session.metadata?.bookingId,
          })) ?? null;

        if (!payment) {
          console.error(
            "[stripe webhook] payment not found for session",
            session.id,
            session.metadata
          );
          break;
        }

        const stripeTotal =
          typeof session.amount_total === "number"
            ? session.amount_total / 100
            : null;

        await markPaymentAndBookingsPaid(String(payment._id), {
          amount: stripeTotal,
          transactionId: session.id,
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const payment = await findPaymentForEvent({
          paymentId: session.metadata?.paymentId,
          sessionId: session.id,
          bookingId: session.metadata?.bookingId,
        });
        await failAndCancelPayment(
          payment ? String(payment._id) : session.metadata?.paymentId,
          "Checkout session expired"
        );
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await findPaymentForEvent({
          paymentId: intent.metadata?.paymentId,
          bookingId: intent.metadata?.bookingId,
        });
        const reason =
          intent.last_payment_error?.message ?? "Payment failed";
        await failAndCancelPayment(
          payment ? String(payment._id) : intent.metadata?.paymentId,
          reason
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        let payment = await findPaymentForEvent({
          paymentId: charge.metadata?.paymentId,
          bookingId: charge.metadata?.bookingId,
        });

        if (!payment && typeof charge.payment_intent === "string") {
          const intent = await getStripe().paymentIntents.retrieve(
            charge.payment_intent
          );
          payment = await findPaymentForEvent({
            paymentId: intent.metadata?.paymentId,
            bookingId: intent.metadata?.bookingId,
          });
        }

        if (payment) {
          await markRefunded(String(payment._id), charge.amount_refunded);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
