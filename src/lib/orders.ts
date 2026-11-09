import "server-only";
import type Stripe from "stripe";
import { query, queryOne, withTransaction, type Tx } from "./db";
import { getSettings } from "./data";
import { getStripe, siteUrl } from "./stripe";
import { effectivePrice } from "./format";
import type { Order, OrderItem, OrderStatus } from "./types";

export class CheckoutError extends Error {
  constructor(message: string, public itemId?: number) {
    super(message);
  }
}

export type CheckoutInput = {
  items: { id: number; quantity: number }[];
  fulfillment_type: "pickup" | "delivery";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  tip_percent: number;
};

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function orderNumber() {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

async function addEvent(tx: Tx | null, orderId: string, type: string, message: string, actor = "system") {
  const sql = `INSERT INTO order_events (order_id, type, message, actor) VALUES ($1,$2,$3,$4)`;
  if (tx) await tx.query(sql, [orderId, type, message, actor]);
  else await query(sql, [orderId, type, message, actor]);
}

/**
 * Reserves stock and creates an order awaiting payment, then opens a Stripe Checkout session.
 * Stock is taken at this moment (so two customers can't buy the last burger) and handed back
 * if the checkout expires or is abandoned.
 */
export async function createCheckout(input: CheckoutInput): Promise<{ url: string; orderId: string }> {
  const stripe = getStripe();
  if (!stripe) throw new CheckoutError("Online payment isn't set up yet. Please call the restaurant to order.");

  await releaseStaleOrders().catch(() => {});
  const settings = await getSettings();
  if (!settings.is_open) throw new CheckoutError("We're not taking online orders right now.");
  if (input.fulfillment_type === "pickup" && !settings.pickup_enabled)
    throw new CheckoutError("Pickup isn't available right now.");
  if (input.fulfillment_type === "delivery" && !settings.delivery_enabled)
    throw new CheckoutError("Delivery isn't available right now.");

  // Merge duplicate lines
  const merged = new Map<number, number>();
  for (const l of input.items) merged.set(l.id, (merged.get(l.id) ?? 0) + l.quantity);
  if (merged.size === 0) throw new CheckoutError("Your cart is empty.");

  const order = await withTransaction(async (tx) => {
    const lines: { id: number; name: string; unit: number; original: number; qty: number; tracked: boolean; after: number }[] = [];
    for (const [id, qty] of merged) {
      const [row] = await tx.query<{
        id: number; name: string; price_cents: number; discount_price_cents: number | null;
        track_stock: boolean; stock_quantity: number;
      }>(
        `UPDATE menu_items
            SET stock_quantity = CASE WHEN track_stock THEN stock_quantity - $2 ELSE stock_quantity END,
                updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL AND is_available
            AND (NOT track_stock OR stock_quantity >= $2)
        RETURNING id, name, price_cents, discount_price_cents, track_stock, stock_quantity`,
        [id, qty]
      );
      if (!row) {
        const [cur] = await tx.query<{ name: string; is_available: boolean; track_stock: boolean; stock_quantity: number }>(
          `SELECT name, is_available, track_stock, stock_quantity FROM menu_items WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        );
        if (!cur) throw new CheckoutError("An item in your cart is no longer on the menu.", id);
        if (!cur.is_available || cur.stock_quantity === 0) throw new CheckoutError(`${cur.name} just sold out.`, id);
        throw new CheckoutError(`Only ${cur.stock_quantity} ${cur.name} left — please lower the quantity.`, id);
      }
      lines.push({
        id: row.id, name: row.name, unit: effectivePrice(row), original: row.price_cents,
        qty, tracked: row.track_stock, after: row.stock_quantity,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const savings = lines.reduce((s, l) => s + (l.original - l.unit) * l.qty, 0);
    if (subtotal < settings.min_order_cents)
      throw new CheckoutError(`The minimum order is $${(settings.min_order_cents / 100).toFixed(2)}.`);
    const tax = Math.round((subtotal * settings.tax_rate_bps) / 10000);
    const delivery = input.fulfillment_type === "delivery" ? settings.delivery_fee_cents : 0;
    const tipPct = [0, 10, 15, 20, 25].includes(input.tip_percent) ? input.tip_percent : 0;
    const tip = Math.round((subtotal * tipPct) / 100);
    const total = subtotal + tax + delivery + tip;

    const isDelivery = input.fulfillment_type === "delivery";
    const [o] = await tx.query<Order>(
      `INSERT INTO orders (order_number, fulfillment_type, customer_name, customer_email, customer_phone,
          address_line1, address_line2, city, state, zip, notes,
          subtotal_cents, savings_cents, tax_cents, delivery_fee_cents, tip_cents, total_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        orderNumber(), input.fulfillment_type, input.customer_name, input.customer_email, input.customer_phone,
        isDelivery ? input.address_line1 : null, isDelivery ? input.address_line2 || null : null,
        isDelivery ? input.city : null, isDelivery ? input.state : null, isDelivery ? input.zip : null,
        input.notes || null, subtotal, savings, tax, delivery, tip, total,
      ]
    );
    for (const l of lines) {
      await tx.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, unit_price_cents, original_price_cents, quantity, line_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [o.id, l.id, l.name, l.unit, l.original, l.qty, l.unit * l.qty]
      );
      if (l.tracked) {
        await tx.query(
          `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, order_id, note)
           VALUES ($1,$2,$3,'order',$4,$5)`,
          [l.id, -l.qty, l.after, o.id, `Reserved for order #${o.order_number}`]
        );
      }
    }
    await addEvent(tx, o.id, "created", "Order placed, waiting for payment");
    return { order: o, lines, tax, delivery, tip };
  });

  const { order: o, lines, tax, delivery, tip } = order;
  const base = siteUrl();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map((l) => ({
    quantity: l.qty,
    price_data: { currency: "usd", unit_amount: l.unit, product_data: { name: l.name } },
  }));
  const extra = (name: string, amount: number) =>
    amount > 0 && lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name } } });
  extra("Sales tax", tax);
  extra("Delivery fee", delivery);
  extra("Tip", tip);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: o.customer_email,
      client_reference_id: o.id,
      metadata: { order_id: o.id, order_number: o.order_number },
      payment_intent_data: {
        metadata: { order_id: o.id, order_number: o.order_number },
        receipt_email: o.customer_email,
        description: `Order #${o.order_number}`,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${base}/order/${o.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?cancelled=${o.id}`,
    });
    await query(`UPDATE orders SET stripe_session_id = $2, updated_at = now() WHERE id = $1`, [o.id, session.id]);
    return { url: session.url!, orderId: o.id };
  } catch (err) {
    await expireOrder(o.id, "Payment page could not be opened").catch(() => {});
    console.error("Stripe checkout error", err);
    throw new CheckoutError("We couldn't open the payment page. Please try again.");
  }
}

/** Idempotent: safe to call from both the webhook and the success page. */
export async function markOrderPaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId || session.payment_status !== "paid") return;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const updated = await withTransaction(async (tx) => {
    const [o] = await tx.query<Order & { stock_released: boolean }>(
      `UPDATE orders SET payment_status = 'paid',
              status = CASE WHEN status IN ('pending_payment','cancelled') THEN 'new' ELSE status END,
              cancelled_at = NULL, paid_at = now(), stripe_payment_intent_id = $2, updated_at = now()
        WHERE id = $1 AND payment_status IN ('unpaid','expired','failed')
        RETURNING *`,
      [orderId, piId]
    );
    if (!o) return null;
    if (o.stock_released) {
      // Paid after the reservation lapsed: take the stock again (never below zero).
      const items = await tx.query<OrderItem>(`SELECT * FROM order_items WHERE order_id = $1`, [o.id]);
      for (const it of items) {
        if (!it.menu_item_id) continue;
        const [m] = await tx.query<{ stock_quantity: number }>(
          `UPDATE menu_items SET stock_quantity = GREATEST(0, stock_quantity - $2), updated_at = now()
            WHERE id = $1 AND track_stock RETURNING stock_quantity`,
          [it.menu_item_id, it.quantity]
        );
        if (m)
          await tx.query(
            `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, order_id, note)
             VALUES ($1,$2,$3,'order',$4,'Re-reserved after late payment')`,
            [it.menu_item_id, -it.quantity, m.stock_quantity, o.id]
          );
      }
      await tx.query(`UPDATE orders SET stock_released = false WHERE id = $1`, [o.id]);
    }
    await addEvent(tx, o.id, "paid", `Payment received`);
    return o;
  });
  if (!updated || !piId) return;
  await recordPayment(piId, updated.id).catch((e) => console.error("recordPayment", e));
}

async function recordPayment(piId: string, orderId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
  const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const card = charge?.payment_method_details?.card;
  await query(
    `INSERT INTO payments (order_id, stripe_payment_intent_id, stripe_charge_id, amount_cents, refunded_cents, status,
                           card_brand, card_last4, receipt_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
       stripe_charge_id = EXCLUDED.stripe_charge_id, refunded_cents = EXCLUDED.refunded_cents,
       status = EXCLUDED.status, receipt_url = EXCLUDED.receipt_url, updated_at = now()`,
    [
      orderId, pi.id, charge?.id ?? null, pi.amount_received || pi.amount, charge?.amount_refunded ?? 0,
      charge?.refunded ? "refunded" : charge?.amount_refunded ? "partially_refunded" : pi.status,
      card?.brand ?? charge?.payment_method_details?.type ?? null, card?.last4 ?? null, charge?.receipt_url ?? null,
    ]
  );
}

/** Return reserved stock to inventory exactly once per order. */
export async function releaseStock(orderId: string, why: string, actor = "system") {
  await withTransaction(async (tx) => {
    const [o] = await tx.query<{ id: string; order_number: string }>(
      `UPDATE orders SET stock_released = true, updated_at = now() WHERE id = $1 AND NOT stock_released
       RETURNING id, order_number`,
      [orderId]
    );
    if (!o) return;
    const items = await tx.query<OrderItem>(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
    for (const it of items) {
      if (!it.menu_item_id) continue;
      const [m] = await tx.query<{ stock_quantity: number }>(
        `UPDATE menu_items SET stock_quantity = stock_quantity + $2, updated_at = now()
          WHERE id = $1 AND track_stock RETURNING stock_quantity`,
        [it.menu_item_id, it.quantity]
      );
      if (m)
        await tx.query(
          `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, order_id, note, actor)
           VALUES ($1,$2,$3,'order_released',$4,$5,$6)`,
          [it.menu_item_id, it.quantity, m.stock_quantity, orderId, `#${o.order_number}: ${why}`, actor]
        );
    }
    await addEvent(tx, orderId, "stock_released", `Items returned to stock (${why})`, actor);
  });
}

/** Cancel an unpaid order and hand its stock back. */
export async function expireOrder(orderId: string, why: string) {
  const o = await queryOne<{ id: string }>(
    `UPDATE orders SET status = 'cancelled', payment_status = 'expired', cancelled_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'pending_payment' AND payment_status = 'unpaid' RETURNING id`,
    [orderId]
  );
  if (!o) return;
  await addEvent(null, orderId, "expired", why);
  await releaseStock(orderId, why);
}

/** Safety net for abandoned checkouts whose expiry webhook never arrived. */
export async function releaseStaleOrders() {
  const stale = await query<{ id: string }>(
    `SELECT id FROM orders WHERE status = 'pending_payment' AND payment_status = 'unpaid'
        AND created_at < now() - interval '40 minutes' ORDER BY created_at LIMIT 25`
  );
  for (const s of stale) await expireOrder(s.id, "Checkout was not completed");
}

/** Customer pressed back on the Stripe page: close the session so stock comes back right away. */
export async function abandonCheckout(orderId: string) {
  const o = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!o || o.status !== "pending_payment") return;
  const stripe = getStripe();
  if (stripe && o.stripe_session_id) {
    try {
      const s = await stripe.checkout.sessions.retrieve(o.stripe_session_id);
      if (s.payment_status === "paid") return markOrderPaid(s);
      if (s.status === "open") await stripe.checkout.sessions.expire(o.stripe_session_id);
    } catch (e) {
      console.error("abandonCheckout", e);
    }
  }
  await expireOrder(orderId, "Customer left the payment page");
}

/** Called from the confirmation page in case the webhook hasn't landed yet. */
export async function syncCheckoutSession(orderId: string, sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  const o = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!o || o.stripe_session_id !== sessionId || o.payment_status === "paid") return;
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  await markOrderPaid(s);
}

// ---------- Admin operations ----------

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: [],
  new: ["preparing", "ready", "completed"],
  preparing: ["ready", "out_for_delivery", "completed"],
  ready: ["out_for_delivery", "completed"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

export function allowedNext(status: OrderStatus, type: "pickup" | "delivery") {
  return NEXT[status].filter((s) => (s === "out_for_delivery" ? type === "delivery" : true));
}

export async function setOrderStatus(orderId: string, status: OrderStatus, actor: string) {
  const o = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!o) throw new Error("Order not found");
  if (!allowedNext(o.status, o.fulfillment_type).includes(status))
    throw new Error(`Can't move an order from ${o.status} to ${status}`);
  await query(
    `UPDATE orders SET status = $2, updated_at = now(),
            completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
      WHERE id = $1`,
    [orderId, status]
  );
  const labels: Record<string, string> = {
    preparing: "Kitchen started preparing", ready: "Marked ready", out_for_delivery: "Sent out for delivery",
    completed: "Order completed",
  };
  await addEvent(null, orderId, status, labels[status] ?? status, actor);
}

export async function refundOrder(orderId: string, amountCents: number | null, actor: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't configured");
  const o = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!o || !o.stripe_payment_intent_id) throw new Error("This order has no payment to refund");
  const refundable = o.total_cents - o.refunded_cents;
  const amount = amountCents == null ? refundable : Math.min(amountCents, refundable);
  if (amount <= 0) throw new Error("Nothing left to refund");
  await stripe.refunds.create({ payment_intent: o.stripe_payment_intent_id, amount, metadata: { order_id: o.id } });
  const refunded = o.refunded_cents + amount;
  const status = refunded >= o.total_cents ? "refunded" : "partially_refunded";
  await query(`UPDATE orders SET refunded_cents = $2, payment_status = $3, updated_at = now() WHERE id = $1`, [o.id, refunded, status]);
  await query(`UPDATE payments SET refunded_cents = $2, status = $3, updated_at = now() WHERE stripe_payment_intent_id = $1`, [
    o.stripe_payment_intent_id, refunded, status,
  ]);
  await addEvent(null, o.id, "refund", `Refunded $${(amount / 100).toFixed(2)}`, actor);
}

export async function cancelOrder(orderId: string, opts: { refund: boolean; restock: boolean; reason: string }, actor: string) {
  const o = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!o) throw new Error("Order not found");
  if (o.status === "cancelled") return;
  if (o.status === "pending_payment") return abandonCheckout(orderId);
  if (opts.refund && o.payment_status === "paid") await refundOrder(orderId, null, actor);
  await query(`UPDATE orders SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1`, [orderId]);
  await addEvent(null, orderId, "cancelled", `Cancelled${opts.reason ? `: ${opts.reason}` : ""}`, actor);
  if (opts.restock) await releaseStock(orderId, "Order cancelled", actor);
}

/** Webhook: keep refunds made in the Stripe Dashboard in sync. */
export async function syncRefundFromCharge(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  const status = charge.refunded ? "refunded" : charge.amount_refunded > 0 ? "partially_refunded" : "paid";
  const o = await queryOne<{ id: string; refunded_cents: number }>(
    `UPDATE orders SET refunded_cents = GREATEST(refunded_cents, $2), payment_status = $3, updated_at = now()
      WHERE stripe_payment_intent_id = $1 RETURNING id, refunded_cents`,
    [piId, charge.amount_refunded, status]
  );
  await query(`UPDATE payments SET refunded_cents = GREATEST(refunded_cents, $2), status = $3, updated_at = now()
                WHERE stripe_payment_intent_id = $1`, [piId, charge.amount_refunded, status]);
  return o;
}

export async function getOrderWithDetails(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const order = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!order) return null;
  const [items, events, payments] = await Promise.all([
    query<OrderItem>(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`, [id]),
    query<{ id: number; type: string; message: string; actor: string; created_at: string }>(
      `SELECT id, type, message, actor, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at, id`,
      [id]
    ),
    query<{ card_brand: string | null; card_last4: string | null; receipt_url: string | null; stripe_charge_id: string | null }>(
      `SELECT card_brand, card_last4, receipt_url, stripe_charge_id FROM payments WHERE order_id = $1`,
      [id]
    ),
  ]);
  return { order, items, events, payment: payments[0] ?? null };
}
