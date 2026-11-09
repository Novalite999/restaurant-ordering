import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Mail, MapPin, Phone, StickyNote } from "lucide-react";
import { allowedNext, getOrderWithDetails } from "@/lib/orders";
import { formatDateTime, money } from "@/lib/format";
import { stripeMode } from "@/lib/stripe";
import { PageHeader, Panel, PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { AdvanceButtons, CancelOrder, PrintButton, RefundOrder } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">) {
  return { title: `Order ${(await params).id.slice(0, 6)}` };
}

export default async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const data = await getOrderWithDetails(id);
  if (!data) notFound();
  const { order: o, items, events, payment } = data;
  const paid = ["paid", "partially_refunded"].includes(o.payment_status);
  const stripeBase = stripeMode() === "test" ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

  return (
    <>
      <div className="px-4 pt-4 lg:px-8 no-print">
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ChevronLeft className="size-4" /> Orders
        </Link>
      </div>
      <PageHeader
        title={`#${o.order_number}`}
        subtitle={`Placed ${formatDateTime(o.created_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <StatusBadge status={o.status} />
            <PrintButton />
          </div>
        }
      />
      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 no-print sm:px-5">
              <AdvanceButtons orderId={o.id} next={allowedNext(o.status, o.fulfillment_type)} />
              <div className="ml-auto flex gap-2">
                {paid && <RefundOrder orderId={o.id} remaining={o.total_cents - o.refunded_cents} />}
                <CancelOrder orderId={o.id} paid={paid} status={o.status} />
              </div>
            </div>
            <ul className="divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist font-bold tabular-nums">{it.quantity}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{it.name}</span>
                    <span className="block text-xs text-muted tabular-nums">
                      {money(it.unit_price_cents)} each
                      {it.original_price_cents > it.unit_price_cents && <s className="ml-1.5">{money(it.original_price_cents)}</s>}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(it.line_total_cents)}</span>
                </li>
              ))}
            </ul>
            {o.notes && (
              <p className="mx-4 mb-4 flex gap-2 rounded-xl bg-mustard-soft px-3 py-2.5 text-sm sm:mx-5">
                <StickyNote className="size-4 shrink-0 translate-y-0.5" />
                {o.notes}
              </p>
            )}
            <dl className="space-y-1.5 border-t border-line px-4 py-4 text-sm sm:px-5">
              <Row l="Subtotal" v={money(o.subtotal_cents)} />
              {o.savings_cents > 0 && <Row l="Discounts given" v={`−${money(o.savings_cents)}`} />}
              <Row l="Sales tax" v={money(o.tax_cents)} />
              {o.delivery_fee_cents > 0 && <Row l="Delivery fee" v={money(o.delivery_fee_cents)} />}
              {o.tip_cents > 0 && <Row l="Tip" v={money(o.tip_cents)} />}
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(o.total_cents)}</dd>
              </div>
              {o.refunded_cents > 0 && <Row l="Refunded" v={`−${money(o.refunded_cents)}`} />}
            </dl>
          </Panel>

          <Panel title="Timeline" className="no-print">
            <ol className="relative px-5 py-4">
              {events.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < events.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-line" />}
                  <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-basil bg-paper" />
                  <div>
                    <p className="text-[15px] font-medium">{e.message}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(e.created_at)}
                      {e.actor !== "system" && `, by ${e.actor}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <div className="space-y-2.5 p-4 text-sm sm:px-5">
              <p className="text-base font-semibold">{o.customer_name}</p>
              <a href={`tel:${o.customer_phone.replace(/\D/g, "")}`} className="flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-muted" /> {o.customer_phone}
              </a>
              <a href={`mailto:${o.customer_email}`} className="flex items-center gap-2 break-all hover:underline">
                <Mail className="size-4 shrink-0 text-muted" /> {o.customer_email}
              </a>
              <p className="flex gap-2">
                <MapPin className="size-4 shrink-0 translate-y-0.5 text-muted" />
                {o.fulfillment_type === "pickup" ? (
                  "Pickup at the counter"
                ) : (
                  <a
                    className="hover:underline"
                    target="_blank"
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${o.address_line1} ${o.address_line2 ?? ""} ${o.city} ${o.state} ${o.zip}`)}`}
                  >
                    {o.address_line1}
                    {o.address_line2 ? `, ${o.address_line2}` : ""}
                    <br />
                    {o.city}, {o.state} {o.zip}
                  </a>
                )}
              </p>
            </div>
          </Panel>
          <Panel title="Payment">
            <dl className="space-y-2 p-4 text-sm sm:px-5">
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd>
                  <PaymentBadge status={o.payment_status} />
                </dd>
              </div>
              {payment?.card_brand && (
                <Row l="Card" v={`${payment.card_brand[0].toUpperCase()}${payment.card_brand.slice(1)}${payment.card_last4 ? ` •••• ${payment.card_last4}` : ""}`} />
              )}
              {o.paid_at && <Row l="Paid" v={formatDateTime(o.paid_at)} />}
              {o.stripe_payment_intent_id && (
                <a
                  target="_blank"
                  href={`${stripeBase}/payments/${o.stripe_payment_intent_id}`}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-basil no-print"
                >
                  Open in Stripe <ExternalLink className="size-3.5" />
                </a>
              )}
              {payment?.receipt_url && (
                <a target="_blank" href={payment.receipt_url} className="ml-4 inline-flex items-center gap-1.5 font-semibold text-basil no-print">
                  Receipt <ExternalLink className="size-3.5" />
                </a>
              )}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{l}</dt>
      <dd className="text-right tabular-nums">{v}</dd>
    </div>
  );
}
