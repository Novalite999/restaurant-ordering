import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Returns a Stripe client, or null when STRIPE_SECRET_KEY isn't configured yet. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key, { appInfo: { name: "restaurant-ordering" } });
  return _stripe;
}

export function stripeMode(): "live" | "test" | "off" {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "off";
  return key.startsWith("sk_live") || key.startsWith("rk_live") ? "live" : "test";
}

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
