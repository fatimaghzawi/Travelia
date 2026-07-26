import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Stripe expects the smallest currency unit (e.g. cents for USD). */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}
