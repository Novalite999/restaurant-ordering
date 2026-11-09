import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { query } from "@/lib/db";
import { expireOrder, markOrderPaid, syncRefundFromCharge } from "@/lib/orders";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  // Idempotency: skip events we've already processed.
  const fresh = await query(`INSERT INTO stripe_events (id, type) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id`, [
    event.id,
    event.type,
  ]);
  if (fresh.length === 0) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await markOrderPaid(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object;
        const id = s.metadata?.order_id || s.client_reference_id;
        if (id) await expireOrder(id, event.type.endsWith("expired") ? "Checkout expired" : "Payment failed");
        break;
      }
      case "charge.refunded":
        await syncRefundFromCharge(event.data.object);
        break;
    }
  } catch (e) {
    // Let Stripe retry.
    await query(`DELETE FROM stripe_events WHERE id = $1`, [event.id]);
    console.error("webhook error", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
