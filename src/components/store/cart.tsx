"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PublicMenuItem } from "@/lib/types";
import { effectivePrice } from "@/lib/format";

export type CartLine = {
  id: number;
  name: string;
  image_url: string | null;
  price_cents: number;
  discount_price_cents: number | null;
  quantity: number;
  /** Max we let them add, when stock is tracked & low. */
  max?: number | null;
};

type CartCtx = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: PublicMenuItem, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  /** Sync cart with the live menu: drop sold-out items, refresh prices. Returns names removed. */
  reconcile: (menu: PublicMenuItem[]) => string[];
  bump: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((item: PublicMenuItem, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      const cap = item.remaining ?? 50;
      if (existing) {
        return prev.map((l) => (l.id === item.id ? { ...l, quantity: Math.min(cap, l.quantity + qty), max: item.remaining } : l));
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          image_url: item.image_url,
          price_cents: item.price_cents,
          discount_price_cents: item.discount_price_cents,
          quantity: Math.min(cap, qty),
          max: item.remaining,
        },
      ];
    });
    setBump((b) => b + 1);
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: Math.min(qty, l.max ?? 50) } : l))
    );
  }, []);

  const remove = useCallback((id: number) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  // Mirror of `lines` so reconcile can compute synchronously and report what it removed.
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;

  const reconcile = useCallback((menu: PublicMenuItem[]) => {
    const byId = new Map(menu.map((m) => [m.id, m]));
    const removed: string[] = [];
    const next: CartLine[] = [];
    for (const l of linesRef.current) {
      const m = byId.get(l.id);
      if (!m || !m.in_stock) {
        removed.push(l.name);
        continue;
      }
      const max = m.remaining;
      next.push({
        ...l,
        name: m.name,
        image_url: m.image_url,
        price_cents: m.price_cents,
        discount_price_cents: m.discount_price_cents,
        max,
        quantity: max != null ? Math.min(l.quantity, max) : l.quantity,
      });
    }
    linesRef.current = next;
    setLines(next);
    return removed;
  }, []);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + effectivePrice(l) * l.quantity, 0);
    return { lines, ready, count, subtotal, add, setQty, remove, clear, reconcile, bump };
  }, [lines, ready, add, setQty, remove, clear, reconcile, bump]);

  return <Ctx value={value}>{children}</Ctx>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

const ORDERS_KEY = "orders.v1";
export function rememberOrder(id: string) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (!ids.includes(id)) localStorage.setItem(ORDERS_KEY, JSON.stringify([id, ...ids].slice(0, 30)));
  } catch {}
}
export function getRememberedOrders(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}
