import Link from "next/link";
import clsx from "clsx";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/admin/ui";
import { RestockForm } from "@/components/admin/restock";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

const REASON: Record<string, string> = {
  order: "Ordered",
  order_released: "Returned",
  restock: "Restocked",
  adjustment: "Adjusted",
  initial: "Starting stock",
};

export default async function Inventory({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const itemFilter = Number(sp.item) || null;
  const [items, logs] = await Promise.all([
    query<{ id: number; name: string; stock_quantity: number; low_stock_threshold: number; is_available: boolean; category: string | null; sold_7d: number }>(
      `SELECT m.id, m.name, m.stock_quantity, m.low_stock_threshold, m.is_available, c.name AS category,
              coalesce((SELECT -sum(change) FROM inventory_logs l WHERE l.menu_item_id = m.id AND l.created_at > now() - interval '7 days'
                         AND l.reason IN ('order','order_released')),0)::int AS sold_7d
         FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
        WHERE m.deleted_at IS NULL AND m.track_stock
        ORDER BY (m.stock_quantity <= m.low_stock_threshold) DESC, m.stock_quantity, m.name`
    ),
    query<{ id: number; name: string; change: number; stock_after: number; reason: string; note: string | null; actor: string; created_at: string; order_id: string | null }>(
      `SELECT l.id, m.name, l.change, l.stock_after, l.reason, l.note, l.actor, l.created_at, l.order_id
         FROM inventory_logs l JOIN menu_items m ON m.id = l.menu_item_id
        ${itemFilter ? "WHERE l.menu_item_id = $1" : ""}
        ORDER BY l.created_at DESC, l.id DESC LIMIT 60`,
      itemFilter ? [itemFilter] : []
    ),
  ]);
  const out = items.filter((i) => i.stock_quantity === 0).length;
  const low = items.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= i.low_stock_threshold).length;
  const units = items.reduce((s, i) => s + i.stock_quantity, 0);

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock drops the moment a customer checks out and comes back if they don't pay." />
      <div className="space-y-4 px-4 lg:px-8">
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Units on hand" value={units} />
          <Mini label="Running low" value={low} tone={low ? "warn" : undefined} />
          <Mini label="Sold out" value={out} tone={out ? "bad" : undefined} />
        </div>

        <Panel title="Stock levels">
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No items track stock yet. Turn on “Track quantity” when editing an item.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 text-right font-medium">On hand</th>
                    <th className="px-4 py-3 text-right font-medium">Sold, 7 days</th>
                    <th className="px-4 py-3 font-medium">Add or remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/inventory?item=${i.id}`} className="font-medium hover:underline">
                          {i.name}
                        </Link>
                        <p className="text-xs text-muted">{i.category ?? "Uncategorized"}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={clsx(
                            "rounded-full px-2.5 py-0.5 font-bold tabular-nums",
                            i.stock_quantity === 0 ? "bg-chili-soft text-chili" : i.stock_quantity <= i.low_stock_threshold ? "bg-mustard-soft" : ""
                          )}
                        >
                          {i.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted tabular-nums">{i.sold_7d}</td>
                      <td className="px-4 py-2.5">
                        <RestockForm id={i.id} name={i.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title={itemFilter && logs[0] ? `Stock history: ${logs[0].name}` : "Stock history"}
          action={itemFilter ? <Link href="/admin/inventory" className="text-sm font-semibold text-basil">Show all</Link> : undefined}
        >
          {logs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">Every stock change will be recorded here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
                  <span className={clsx("w-12 shrink-0 text-right font-bold tabular-nums", l.change > 0 ? "text-basil" : "text-chili")}>
                    {l.change > 0 ? `+${l.change}` : l.change}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{l.name}</span>{" "}
                    <span className="text-muted">
                      {REASON[l.reason] ?? l.reason}
                      {l.note ? `: ${l.note}` : ""}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDateTime(l.created_at)}
                      {l.actor !== "system" ? `, by ${l.actor}` : ""}
                      {l.order_id && (
                        <>
                          {", "}
                          <Link href={`/admin/orders/${l.order_id}`} className="underline">
                            view order
                          </Link>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{l.stock_after} left</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div className={clsx("rounded-[var(--radius-card)] p-4 shadow-lift", tone === "bad" ? "bg-chili-soft" : tone === "warn" ? "bg-mustard-soft" : "bg-paper")}>
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
