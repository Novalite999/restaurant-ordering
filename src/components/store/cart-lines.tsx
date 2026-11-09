"use client";

import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { effectivePrice, isDiscounted, money } from "@/lib/format";
import { FoodImage, QtyStepper } from "./bits";
import { useCart } from "./cart";

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { lines, setQty, remove } = useCart();
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={l.id} className="flex gap-3 py-3">
          <FoodImage src={l.image_url} alt="" className={compact ? "size-14 shrink-0 rounded-xl" : "size-18 shrink-0 rounded-2xl"} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="leading-snug font-medium">{l.name}</p>
              <p className="shrink-0 font-semibold tabular-nums">{money(effectivePrice(l) * l.quantity)}</p>
            </div>
            <p className="text-sm text-muted tabular-nums">
              {money(effectivePrice(l))} each
              {isDiscounted(l) && <s className="ml-1.5">{money(l.price_cents)}</s>}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <QtyStepper size="sm" value={l.quantity} onChange={(v) => setQty(l.id, v)} max={l.max} label={l.name} />
              <button
                onClick={() => remove(l.id)}
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-chili-soft hover:text-chili"
                aria-label={`Remove ${l.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-mustard-soft">
        <ShoppingBag className="size-7 text-ink" strokeWidth={1.75} />
      </div>
      <p className="mt-4 font-display text-lg font-semibold">Your cart is empty</p>
      <p className="mt-1 text-sm text-muted">Pick something from the menu to get started.</p>
      <Link href="/" className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
        Browse the menu
      </Link>
    </div>
  );
}
