"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import clsx from "clsx";
import { getRememberedOrders } from "@/components/store/cart";
import { formatDateTime, money, STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

type Row = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  item_count: number;
  summary: string | null;
};

const ACTIVE = ["new", "preparing", "ready", "out_for_delivery"];

export default function MyOrders() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const ids = getRememberedOrders();
    if (ids.length === 0) return setRows([]);
    fetch(`/api/orders/status?ids=${ids.join(",")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows((d.orders as Row[]).filter((o) => o.status !== "pending_payment")))
      .catch(() => setRows([]));
  }, []);

  return (
    <main className="mx-auto max-w-xl px-4 pt-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">My orders</h1>
      <p className="mt-1 text-sm text-muted">Orders placed on this device.</p>
      {rows === null ? (
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-paper" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--radius-card)] bg-paper px-6 py-12 text-center shadow-lift">
          <ReceiptText className="size-9 text-muted" strokeWidth={1.5} />
          <p className="mt-3 font-display text-lg font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-muted">When you order, you can track it here.</p>
          <Link href="/" className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
            Start an order
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] bg-paper p-4 shadow-lift">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">#{o.order_number}</span>
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        ACTIVE.includes(o.status)
                          ? "bg-basil-soft text-basil-dark"
                          : o.status === "cancelled"
                            ? "bg-chili-soft text-chili"
                            : "bg-mist text-muted"
                      )}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-soft">{o.summary}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(o.created_at)}, {money(o.total_cents)}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
