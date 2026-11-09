import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { query, queryOne } from "@/lib/db";
import { releaseStaleOrders } from "@/lib/orders";
import { formatTime, money, timeAgo } from "@/lib/format";
import { stripeMode } from "@/lib/stripe";
import type { Order } from "@/lib/types";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

const TZ = process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE || "America/Chicago";
const PAID = `payment_status IN ('paid','partially_refunded','refunded') AND status <> 'pending_payment'`;

export default async function Overview() {
  await releaseStaleOrders().catch(() => {});
  const [kpi, series, low, recent, top] = await Promise.all([
    queryOne<{ today_rev: number; today_orders: number; yday_rev: number; active: number; week_rev: number; week_orders: number }>(
      `SELECT
         coalesce(sum(total_cents - refunded_cents) FILTER (WHERE (paid_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date),0)::int AS today_rev,
         count(*) FILTER (WHERE (paid_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date)::int AS today_orders,
         coalesce(sum(total_cents - refunded_cents) FILTER (WHERE (paid_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date - 1),0)::int AS yday_rev,
         count(*) FILTER (WHERE status IN ('new','preparing','ready','out_for_delivery'))::int AS active,
         coalesce(sum(total_cents - refunded_cents) FILTER (WHERE paid_at > now() - interval '7 days'),0)::int AS week_rev,
         count(*) FILTER (WHERE paid_at > now() - interval '7 days')::int AS week_orders
       FROM orders WHERE ${PAID}`,
      [TZ]
    ),
    query<{ d: string; revenue: number; orders: number }>(
      `SELECT to_char(g.d, 'Mon DD') AS d,
              coalesce(sum(o.total_cents - o.refunded_cents),0)::int AS revenue, count(o.id)::int AS orders
         FROM generate_series((now() AT TIME ZONE $1)::date - 13, (now() AT TIME ZONE $1)::date, interval '1 day') g(d)
         LEFT JOIN orders o ON (o.paid_at AT TIME ZONE $1)::date = g.d::date AND o.payment_status IN ('paid','partially_refunded','refunded') AND o.status <> 'pending_payment'
        GROUP BY g.d ORDER BY g.d`,
      [TZ]
    ),
    query<{ id: number; name: string; stock_quantity: number; low_stock_threshold: number; is_available: boolean }>(
      `SELECT id, name, stock_quantity, low_stock_threshold, is_available FROM menu_items
        WHERE deleted_at IS NULL AND track_stock AND stock_quantity <= low_stock_threshold
        ORDER BY stock_quantity, name LIMIT 8`
    ),
    query<Order>(
      `SELECT o.*, (SELECT coalesce(sum(quantity),0)::int FROM order_items WHERE order_id = o.id) AS item_count
         FROM orders o WHERE status <> 'pending_payment' ORDER BY created_at DESC LIMIT 6`
    ),
    query<{ name: string; qty: number; revenue: number }>(
      `SELECT oi.name, sum(oi.quantity)::int AS qty, sum(oi.line_total_cents)::int AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.paid_at > now() - interval '7 days' AND o.status <> 'cancelled'
        GROUP BY oi.name ORDER BY qty DESC LIMIT 5`
    ),
  ]);

  const k = kpi!;
  const avg = k.week_orders ? Math.round(k.week_rev / k.week_orders) : 0;
  const diff = k.yday_rev ? Math.round(((k.today_rev - k.yday_rev) / k.yday_rev) * 100) : null;
  const mode = stripeMode();

  return (
    <>
      <PageHeader title="Overview" subtitle={`Updated ${formatTime(new Date())}`} />
      <div className="space-y-4 px-4 lg:px-8">
        {mode !== "live" && (
          <div className="flex gap-3 rounded-2xl bg-mustard-soft p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              {mode === "off" ? (
                <>
                  <strong>Payments are off.</strong> Add your Stripe keys (STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET) in Vercel to start
                  taking orders.
                </>
              ) : (
                <>
                  <strong>Stripe is in test mode.</strong> Orders use test cards and no real money moves. Switch to live keys before launch.
                </>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:reveal [&>*:nth-child(2)]:[--i:1] [&>*:nth-child(3)]:[--i:2] [&>*:nth-child(4)]:[--i:3]">
          <Kpi label="Sales today" value={money(k.today_rev)} note={diff == null ? "No sales yesterday" : `${diff >= 0 ? "+" : ""}${diff}% vs yesterday`} />
          <Kpi label="Orders today" value={String(k.today_orders)} />
          <Kpi label="In the kitchen" value={String(k.active)} href="/admin/orders" highlight={k.active > 0} />
          <Kpi label="Avg order (7 days)" value={money(avg)} note={`${k.week_orders} orders, ${money(k.week_rev)}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Sales, last 14 days">
            <RevenueChart data={series.map((s) => ({ day: s.d, revenue: s.revenue / 100, orders: s.orders }))} />
          </Panel>
          <Panel title="Best sellers this week">
            {top.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Sales will show here once orders come in.</p>
            ) : (
              <ol className="divide-y divide-line">
                {top.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-4 text-sm font-bold text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                    <span className="text-sm text-muted tabular-nums">{t.qty} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Latest orders" action={<Link href="/admin/orders?view=all" className="text-sm font-semibold text-basil">See all</Link>}>
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No orders yet. Share your storefront link to get the first one.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-mist/60">
                      <span className="w-20 font-display font-bold">#{o.order_number}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {o.customer_name}
                        <span className="text-muted">, {o.item_count} items, {timeAgo(o.created_at)}</span>
                      </span>
                      <StatusBadge status={o.status} />
                      <span className="hidden w-20 text-right font-semibold tabular-nums sm:block">{money(o.total_cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Running low" action={<Link href="/admin/inventory" className="text-sm font-semibold text-basil">Inventory</Link>}>
            {low.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Everything is well stocked.</p>
            ) : (
              <ul className="divide-y divide-line">
                {low.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0 truncate font-medium">{m.name}</span>
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums " +
                        (m.stock_quantity === 0 ? "bg-chili-soft text-chili" : "bg-mustard-soft text-ink")
                      }
                    >
                      {m.stock_quantity === 0 ? "Sold out" : `${m.stock_quantity} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, note, href, highlight }: { label: string; value: string; note?: string; href?: string; highlight?: boolean }) {
  const body = (
    <div className={"lift h-full rounded-[var(--radius-card)] p-4 shadow-lift sm:p-5 " + (highlight ? "bg-basil text-paper" : "bg-paper")}>
      <p className={"text-sm " + (highlight ? "text-paper/75" : "text-muted")}>{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {note && <p className={"mt-1 text-xs " + (highlight ? "text-paper/75" : "text-muted")}>{note}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
