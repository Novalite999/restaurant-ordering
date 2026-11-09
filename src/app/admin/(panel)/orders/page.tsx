import Link from "next/link";
import clsx from "clsx";
import { Search, StickyNote } from "lucide-react";
import { query } from "@/lib/db";
import { allowedNext, releaseStaleOrders } from "@/lib/orders";
import { formatDateTime, formatTime, money, timeAgo } from "@/lib/format";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { Empty, PageHeader, Panel, PaymentBadge, StatusBadge, input } from "@/components/admin/ui";
import { AdvanceButtons } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const LANES: { key: string; title: string; statuses: OrderStatus[]; tone: string }[] = [
  { key: "new", title: "New", statuses: ["new"], tone: "bg-mustard" },
  { key: "preparing", title: "Preparing", statuses: ["preparing"], tone: "bg-sky" },
  { key: "ready", title: "Ready & on the way", statuses: ["ready", "out_for_delivery"], tone: "bg-basil" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const view = sp.view === "all" ? "all" : "live";
  await releaseStaleOrders().catch(() => {});

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={view === "live" ? "Tickets update automatically. New ones ring." : "Every order, newest first"}
        actions={
          <div className="inline-flex rounded-full bg-paper p-1 shadow-lift">
            {(["live", "all"] as const).map((v) => (
              <Link
                key={v}
                href={v === "live" ? "/admin/orders" : "/admin/orders?view=all"}
                className={clsx("press rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200", view === v ? "bg-ink text-paper" : "text-muted hover:text-ink")}
              >
                {v === "live" ? "Kitchen" : "All orders"}
              </Link>
            ))}
          </div>
        }
      />
      {view === "live" ? <Board /> : <AllOrders sp={sp} />}
    </>
  );
}

async function Board() {
  const orders = await query<Order>(
    `SELECT * FROM orders WHERE status IN ('new','preparing','ready','out_for_delivery') ORDER BY paid_at NULLS LAST, created_at`
  );
  const items = orders.length
    ? await query<OrderItem>(`SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY id`, [orders.map((o) => o.id)])
    : [];
  const byOrder = new Map<string, OrderItem[]>();
  for (const it of items) byOrder.set(it.order_id, [...(byOrder.get(it.order_id) ?? []), it]);

  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-8">
      {LANES.map((lane) => {
        const list = orders.filter((o) => lane.statuses.includes(o.status));
        return (
          <section key={lane.key} className="w-[86%] shrink-0 snap-start sm:w-[380px] lg:w-auto">
            <div className="mb-3 flex items-center gap-2">
              <span className={clsx("size-2.5 rounded-full", lane.tone)} />
              <h2 className="font-display text-lg font-bold">{lane.title}</h2>
              <span className="rounded-full bg-paper px-2 text-sm font-semibold text-muted shadow-sm">{list.length}</span>
            </div>
            <div className="space-y-4">
              {list.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted animate-fade-in">No tickets</p>
              )}
              {list.map((o) => (
                <Ticket key={o.id} o={o} items={byOrder.get(o.id) ?? []} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Ticket({ o, items }: { o: Order; items: OrderItem[] }) {
  const mins = Math.round((Date.now() - new Date(o.paid_at ?? o.created_at).getTime()) / 60000);
  const late = o.status === "new" ? mins >= 5 : o.status === "preparing" ? mins >= 30 : false;
  return (
    <article className="ticket-edge lift animate-slide-in bg-paper pb-6 shadow-lift">
      <Link href={`/admin/orders/${o.id}`} className="block px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-2xl leading-none font-extrabold tabular-nums">#{o.order_number}</p>
            <p className="mt-1 text-sm font-medium">{o.customer_name}</p>
          </div>
          <div className="text-right">
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                o.fulfillment_type === "delivery" ? "bg-sky-soft text-sky" : "bg-mist text-ink-soft"
              )}
            >
              {o.fulfillment_type}
            </span>
            <p className={clsx("mt-1.5 text-xs tabular-nums", late ? "font-bold text-chili" : "text-muted")}>
              {formatTime(o.paid_at ?? o.created_at)}, {mins} min
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1 border-t-2 border-dashed border-line pt-3 text-[15px]">
          {items.map((it) => (
            <li key={it.id} className="flex gap-2">
              <span className="w-6 shrink-0 font-bold tabular-nums">{it.quantity}×</span>
              <span>{it.name}</span>
            </li>
          ))}
        </ul>
        {o.notes && (
          <p className="mt-3 flex gap-2 rounded-xl bg-mustard-soft px-3 py-2 text-sm">
            <StickyNote className="size-4 shrink-0 translate-y-0.5" />
            {o.notes}
          </p>
        )}
        {o.fulfillment_type === "delivery" && (
          <p className="mt-2 text-xs text-muted">
            {o.address_line1}, {o.city}
          </p>
        )}
      </Link>
      <div className="mt-3 flex items-center gap-3 px-4">
        <span className="text-sm font-semibold tabular-nums">{money(o.total_cents)}</span>
        <div className="flex-1">
          <AdvanceButtons orderId={o.id} next={allowedNext(o.status, o.fulfillment_type)} size="sm" primaryOnly />
        </div>
      </div>
    </article>
  );
}

async function AllOrders({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 25;
  const where: string[] = ["status <> 'pending_payment'"];
  const params: unknown[] = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_email ILIKE $${params.length} OR customer_phone ILIKE $${params.length})`
    );
  }
  params.push(per + 1, (page - 1) * per);
  const rows = await query<Order>(
    `SELECT o.*, (SELECT coalesce(sum(quantity),0)::int FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const hasMore = rows.length > per;
  const list = rows.slice(0, per);
  const qs = (p: number) => `?view=all${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}&page=${p}`;

  return (
    <div className="px-4 lg:px-8">
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="view" value="all" />
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Order #, name, email or phone" className={clsx(input, "pl-9")} />
        </label>
        <select name="status" defaultValue={status} className={clsx(input, "w-auto")}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-paper">Filter</button>
      </form>
      <Panel>
        {list.length === 0 ? (
          <Empty title="No orders found">{q || status ? "Try a different search or filter." : "Orders appear here once customers pay."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((o) => (
                  <tr key={o.id} className="transition-colors duration-150 hover:bg-mist/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-display font-bold hover:underline">
                        #{o.order_number}
                      </Link>
                      <p className="text-xs text-muted capitalize">
                        {o.fulfillment_type}, {o.item_count} items
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.customer_name}</p>
                      <p className="text-xs text-muted">{o.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(o.created_at)}
                      <p className="text-xs text-muted">{timeAgo(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={o.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {(page > 1 || hasMore) && (
        <div className="mt-4 flex justify-between">
          {page > 1 ? <Link className="text-sm font-semibold text-basil" href={qs(page - 1)}>Newer</Link> : <span />}
          {hasMore && <Link className="text-sm font-semibold text-basil" href={qs(page + 1)}>Older</Link>}
        </div>
      )}
    </div>
  );
}
