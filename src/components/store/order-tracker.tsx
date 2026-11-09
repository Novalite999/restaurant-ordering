"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import clsx from "clsx";
import type { OrderStatus } from "@/lib/types";
import { rememberOrder, useCart } from "./cart";

/** Remembers the order on this device, clears the cart once paid, and refreshes as the kitchen updates it. */
export function OrderLive({ id, status, paid, justPaid }: { id: string; status: OrderStatus; paid: boolean; justPaid: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const cleared = useRef(false);
  useEffect(() => {
    rememberOrder(id);
  }, [id]);
  useEffect(() => {
    if (paid && justPaid && cart.ready && !cleared.current) {
      cleared.current = true;
      cart.clear();
    }
  }, [paid, justPaid, cart]);
  useEffect(() => {
    if (status === "completed" || status === "cancelled") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/status?ids=${id}`, { cache: "no-store" });
        const d = await r.json();
        const o = d.orders?.[0];
        if (o && (o.status !== status || o.payment_status === "paid") && o.status !== status) router.refresh();
        if (o && !paid && o.payment_status === "paid") router.refresh();
      } catch {}
    }, status === "pending_payment" ? 3000 : 12000);
    return () => clearInterval(t);
  }, [id, status, paid, router]);
  return null;
}

export function ProgressSteps({ status, type }: { status: OrderStatus; type: "pickup" | "delivery" }) {
  const steps =
    type === "delivery"
      ? [
          { key: "new", label: "Received" },
          { key: "preparing", label: "Cooking" },
          { key: "out_for_delivery", label: "On the way" },
          { key: "completed", label: "Delivered" },
        ]
      : [
          { key: "new", label: "Received" },
          { key: "preparing", label: "Cooking" },
          { key: "ready", label: "Ready" },
          { key: "completed", label: "Picked up" },
        ];
  const order = ["new", "preparing", "ready", "out_for_delivery", "completed"];
  const cur = order.indexOf(status);
  const reached = (k: string) => cur >= order.indexOf(k);
  return (
    <ol className="grid grid-cols-4 gap-1">
      {steps.map((s, i) => {
        const done = reached(s.key);
        const current = done && (i === steps.length - 1 || !reached(steps[i + 1].key));
        return (
          <li key={s.key} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={clsx("h-1 flex-1 rounded-full", i === 0 ? "invisible" : done ? "bg-basil" : "bg-line")} />
              <span
                className={clsx(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 transition",
                  done ? "border-basil bg-basil text-paper" : "border-line bg-paper text-muted",
                  current && status !== "completed" && "ring-4 ring-basil/20"
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </span>
              <span className={clsx("h-1 flex-1 rounded-full", i === steps.length - 1 ? "invisible" : reached(steps[i + 1].key) ? "bg-basil" : "bg-line")} />
            </div>
            <span className={clsx("mt-1.5 text-xs font-medium", done ? "text-ink" : "text-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
