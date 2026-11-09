"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { PublicMenuItem } from "@/lib/types";
import { effectivePrice, money, percentOff } from "@/lib/format";
import { FoodImage, Price, QtyStepper, Tag } from "./bits";
import { useCart } from "./cart";

export function ItemSheet({
  item,
  onClose,
  canOrder,
}: {
  item: PublicMenuItem | null;
  onClose: () => void;
  canOrder: boolean;
}) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;
  const inCart = lines.find((l) => l.id === item.id)?.quantity ?? 0;
  const max = item.remaining != null ? Math.max(0, item.remaining - inCart) : null;
  const off = percentOff(item);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={item.name}>
      <button className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-sheet animate-sheet-up sm:max-w-lg sm:rounded-[28px]">
        <div className="relative shrink-0">
          <FoodImage src={item.image_url} alt={item.name} className="aspect-[16/10] w-full" />
          <span className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-paper/80 sm:hidden" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-paper/95 shadow-lift"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {off > 0 && (
            <span className="absolute bottom-3 left-4 rounded-full bg-mustard px-3 py-1 text-sm font-bold text-ink">
              Save {off}%
            </span>
          )}
        </div>
        <div className="overflow-y-auto px-5 pt-5 pb-4">
          <h2 className="font-display text-2xl leading-tight font-bold tracking-tight">{item.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Price item={item} size="lg" />
            {item.calories != null && <span className="text-sm text-muted">{item.calories} cal</span>}
          </div>
          {item.description && <p className="mt-3 leading-relaxed text-ink-soft">{item.description}</p>}
          {item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Tag key={t} t={t} />
              ))}
            </div>
          )}
          {item.remaining != null && item.in_stock && (
            <p className="mt-4 rounded-xl bg-mustard-soft px-3 py-2 text-sm font-medium">
              Only {item.remaining} left today{inCart > 0 ? ` (${inCart} in your cart)` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {item.in_stock && canOrder ? (
            <>
              <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} max={max} label={item.name} />
              <button
                disabled={max === 0}
                onClick={() => {
                  add(item, qty);
                  toast.success(`Added ${qty} × ${item.name}`);
                  onClose();
                }}
                className="flex h-13 flex-1 items-center justify-between rounded-full bg-basil px-5 font-semibold text-paper transition hover:bg-basil-dark active:scale-[0.98] disabled:opacity-40"
              >
                <span>{max === 0 ? "Max in cart" : "Add to order"}</span>
                <span className="tabular-nums">{money(effectivePrice(item) * qty)}</span>
              </button>
            </>
          ) : (
            <p className="w-full rounded-full bg-mist py-3.5 text-center font-semibold text-muted">
              {!item.in_stock ? "Sold out for now" : "Online ordering is paused"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
