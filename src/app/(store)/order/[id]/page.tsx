import Link from "next/link";
import { notFound } from "next/navigation";
import { Loader2, MapPin, Phone } from "lucide-react";
import { getOrderWithDetails, syncCheckoutSession } from "@/lib/orders";
import { getSettings } from "@/lib/data";
import { formatDateTime, formatTime, money } from "@/lib/format";
import { OrderLive, ProgressSteps } from "@/components/store/order-tracker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order" };

const HEADLINE: Record<string, string> = {
  pending_payment: "Confirming your payment",
  new: "We've got your order",
  preparing: "Your food is cooking",
  ready: "Ready for pickup",
  out_for_delivery: "On its way to you",
  completed: "Enjoy your meal",
  cancelled: "This order was cancelled",
};

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (sessionId) await syncCheckoutSession(id, sessionId).catch((e) => console.error(e));

  const [data, settings] = await Promise.all([getOrderWithDetails(id), getSettings()]);
  if (!data) notFound();
  const { order: o, items } = data;
  const paid = ["paid", "refunded", "partially_refunded"].includes(o.payment_status);
  const eta = o.paid_at ? new Date(new Date(o.paid_at).getTime() + settings.prep_time_minutes * 60000) : null;

  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <OrderLive id={o.id} status={o.status} paid={paid} justPaid={!!sessionId} />

      <div className="ticket-edge bg-paper px-5 pt-6 pb-10 shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Order number</p>
            <p className="font-display text-4xl font-extrabold tracking-tight tabular-nums">#{o.order_number}</p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold capitalize">{o.fulfillment_type}</span>
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{HEADLINE[o.status]}</h1>
        {o.status === "pending_payment" && (
          <p className="mt-1 flex items-center gap-2 text-muted">
            <Loader2 className="size-4 animate-spin" /> This usually takes a few seconds.
          </p>
        )}
        {o.status === "cancelled" && (
          <p className="mt-1 text-muted">
            {o.payment_status === "expired"
              ? "Payment wasn't completed, so nothing was charged."
              : o.refunded_cents > 0
                ? `A refund of ${money(o.refunded_cents)} is on its way to your card (5–10 business days).`
                : `Questions? Call us at ${settings.phone}.`}
          </p>
        )}
        {eta && !["completed", "cancelled"].includes(o.status) && (
          <p className="mt-1 text-muted">
            Estimated {o.fulfillment_type === "pickup" ? "ready" : "arrival"} around{" "}
            <strong className="text-ink">{formatTime(eta)}</strong>
          </p>
        )}

        {!["pending_payment", "cancelled"].includes(o.status) && (
          <div className="mt-6">
            <ProgressSteps status={o.status} type={o.fulfillment_type} />
          </div>
        )}

        <div className="my-6 border-t-2 border-dashed border-line" />

        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span>
                <span className="font-semibold tabular-nums">{it.quantity}×</span> {it.name}
              </span>
              <span className="tabular-nums">{money(it.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <Line l="Subtotal" v={money(o.subtotal_cents)} />
          {o.savings_cents > 0 && <Line l="You saved" v={money(o.savings_cents)} />}
          <Line l="Tax" v={money(o.tax_cents)} />
          {o.delivery_fee_cents > 0 && <Line l="Delivery" v={money(o.delivery_fee_cents)} />}
          {o.tip_cents > 0 && <Line l="Tip" v={money(o.tip_cents)} />}
          <div className="flex justify-between pt-1.5 text-base font-bold">
            <dt>Total {paid ? "paid" : ""}</dt>
            <dd className="tabular-nums">{money(o.total_cents)}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-2 rounded-2xl bg-mist p-4 text-sm">
          {o.fulfillment_type === "pickup" ? (
            <p className="flex gap-2">
              <MapPin className="size-4 shrink-0 translate-y-0.5" /> Pick up at {settings.address}
            </p>
          ) : (
            <p className="flex gap-2">
              <MapPin className="size-4 shrink-0 translate-y-0.5" />
              Delivering to {o.address_line1}
              {o.address_line2 ? `, ${o.address_line2}` : ""}, {o.city}, {o.state} {o.zip}
            </p>
          )}
          <p className="flex gap-2">
            <Phone className="size-4 shrink-0 translate-y-0.5" /> Need help? Call{" "}
            <a className="font-semibold underline" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>
              {settings.phone}
            </a>
          </p>
          <p className="text-muted">Placed {formatDateTime(o.created_at)}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/" className="flex h-12 flex-1 items-center justify-center rounded-full bg-ink font-semibold text-paper">
          Order more
        </Link>
        <Link href="/orders" className="flex h-12 flex-1 items-center justify-center rounded-full bg-paper font-semibold shadow-lift">
          All my orders
        </Link>
      </div>
    </main>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{l}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
