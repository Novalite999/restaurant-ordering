import Link from "next/link";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { query, queryOne } from "@/lib/db";
import { formatDateTime, money } from "@/lib/format";
import { stripeMode } from "@/lib/stripe";
import { PageHeader, Panel, PaymentBadge } from "@/components/admin/ui";
import type { PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

const RANGES = { "7": "7 days", "30": "30 days", "90": "90 days" } as const;

export default async function Payments({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const days = (typeof sp.days === "string" && sp.days in RANGES ? sp.days : "30") as keyof typeof RANGES;
  const [sum, rows] = await Promise.all([
    queryOne<{ gross: number; refunds: number; tips: number; tax: number; fees: number; count: number }>(
      `SELECT coalesce(sum(total_cents),0)::int AS gross, coalesce(sum(refunded_cents),0)::int AS refunds,
              coalesce(sum(tip_cents),0)::int AS tips, coalesce(sum(tax_cents),0)::int AS tax,
              coalesce(sum(delivery_fee_cents),0)::int AS fees, count(*)::int AS count
         FROM orders WHERE paid_at > now() - ($1 || ' days')::interval`,
      [days]
    ),
    query<{
      order_id: string; order_number: string; customer_name: string; amount_cents: number; refunded_cents: number;
      status: PaymentStatus; card_brand: string | null; card_last4: string | null; created_at: string; pi: string | null;
    }>(
      `SELECT o.id AS order_id, o.order_number, o.customer_name, o.total_cents AS amount_cents, o.refunded_cents,
              o.payment_status AS status, p.card_brand, p.card_last4, o.paid_at AS created_at, o.stripe_payment_intent_id AS pi
         FROM orders o LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.paid_at > now() - ($1 || ' days')::interval
        ORDER BY o.paid_at DESC LIMIT 200`,
      [days]
    ),
  ]);
  const s = sum!;
  const base = stripeMode() === "test" ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Card payments through Stripe. Payouts land in your bank on Stripe's schedule."
        actions={
          <div className="inline-flex rounded-full bg-paper p-1 shadow-lift">
            {Object.entries(RANGES).map(([k, l]) => (
              <Link
                key={k}
                href={`/admin/payments?days=${k}`}
                className={clsx("rounded-full px-3.5 py-1.5 text-sm font-semibold", days === k ? "bg-ink text-paper" : "text-muted")}
              >
                {l}
              </Link>
            ))}
          </div>
        }
      />
      <div className="space-y-4 px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Net sales" value={money(s.gross - s.refunds)} strong />
          <Stat label="Gross collected" value={money(s.gross)} note={`${s.count} payments`} />
          <Stat label="Refunded" value={money(s.refunds)} />
          <Stat label="Sales tax collected" value={money(s.tax)} />
          <Stat label="Tips" value={money(s.tips)} note={s.fees ? `Delivery fees ${money(s.fees)}` : undefined} />
        </div>
        <Panel
          title="Transactions"
          action={
            <a href={`${base}/payments`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-basil">
              Stripe dashboard <ExternalLink className="size-3.5" />
            </a>
          }
        >
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No payments in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="text-left text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Card</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.order_id} className="hover:bg-mist/60">
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/orders/${r.order_id}`} className="font-semibold hover:underline">
                          #{r.order_number}
                        </Link>
                        <span className="text-muted">, {r.customer_name}</span>
                      </td>
                      <td className="px-4 py-2.5 capitalize">
                        {r.card_brand ? `${r.card_brand}${r.card_last4 ? ` •••• ${r.card_last4}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <PaymentBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {money(r.amount_cents)}
                        {r.refunded_cents > 0 && <span className="block text-xs font-normal text-chili">−{money(r.refunded_cents)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={clsx("rounded-[var(--radius-card)] p-4 shadow-lift", strong ? "bg-ink text-paper" : "bg-paper")}>
      <p className={clsx("text-xs sm:text-sm", strong ? "text-paper/70" : "text-muted")}>{label}</p>
      <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
      {note && <p className={clsx("text-xs", strong ? "text-paper/70" : "text-muted")}>{note}</p>}
    </div>
  );
}
