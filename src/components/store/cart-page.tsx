"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { PublicMenuItem, Settings } from "@/lib/types";
import { money } from "@/lib/format";
import { useCart } from "./cart";
import { CartLines, EmptyCart } from "./cart-lines";

export function CartPage({ items, settings }: { items: PublicMenuItem[]; settings: Settings }) {
  const cart = useCart();
  const done = useRef(false);
  useEffect(() => {
    if (!cart.ready || done.current) return;
    done.current = true;
    const removed = cart.reconcile(items);
    if (removed.length) toast.warning(`Removed (sold out): ${removed.join(", ")}`);
  }, [cart, items]);

  const short = settings.min_order_cents - cart.subtotal;

  return (
    <main className="mx-auto max-w-xl px-4 pt-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Your cart</h1>
      {!cart.ready ? null : cart.lines.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-paper shadow-lift">
          <EmptyCart />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-[var(--radius-card)] bg-paper px-4 py-1 shadow-lift">
            <CartLines />
          </div>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-basil">
            Add more items
          </Link>
          <div className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-lift">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">Tax, tip and any delivery fee are added at checkout.</p>
            {short > 0 && (
              <p className="mt-3 rounded-xl bg-mustard-soft px-3 py-2 text-sm font-medium">
                Add {money(short)} more to reach the {money(settings.min_order_cents)} minimum.
              </p>
            )}
          </div>
          <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] mt-5 lg:static">
            {settings.is_open ? (
              <Link
                href={short > 0 ? "#" : "/checkout"}
                aria-disabled={short > 0}
                className={
                  "flex h-14 items-center justify-between rounded-full px-6 font-semibold text-paper shadow-sheet transition " +
                  (short > 0 ? "pointer-events-none bg-muted/60" : "bg-basil hover:bg-basil-dark")
                }
              >
                <span>Checkout</span>
                <span className="tabular-nums">{money(cart.subtotal)}</span>
              </Link>
            ) : (
              <p className="rounded-full bg-chili-soft py-4 text-center font-semibold text-chili">Online ordering is paused</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
