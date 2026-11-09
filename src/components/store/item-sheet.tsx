"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
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
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  // Play the exit animation, then unmount.
  const close = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onClose();
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, close]);

  if (!item) return null;
  const inCart = lines.find((l) => l.id === item.id)?.quantity ?? 0;
  const max = item.remaining != null ? Math.max(0, item.remaining - inCart) : null;
  const off = percentOff(item);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={item.name}>
      <button
        className={clsx("absolute inset-0 bg-ink/50", closing ? "animate-fade-out" : "animate-fade-in")}
        onClick={close}
        aria-label="Close"
      />
      <div
        ref={panel}
        className={clsx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-sheet will-change-transform sm:max-w-lg sm:rounded-[28px]",
          closing ? "animate-sheet-down sm:animate-modal-out" : "animate-sheet-up sm:animate-modal-in"
        )}
      >
        {/* Drag the photo down to dismiss, like a native sheet */}
        <div
          className="relative shrink-0 touch-pan-x"
          onTouchStart={(e) => (drag.current = { y: e.touches[0].clientY, dy: 0 })}
          onTouchMove={(e) => {
            if (!drag.current || !panel.current) return;
            const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
            drag.current.dy = dy;
            panel.current.style.transform = `translateY(${dy}px)`;
          }}
          onTouchEnd={() => {
            const d = drag.current;
            drag.current = null;
            if (!panel.current || !d) return;
            if (d.dy > 90) return onClose();
            panel.current.style.transition = "transform 0.25s cubic-bezier(0.2,0.9,0.25,1)";
            panel.current.style.transform = "";
            setTimeout(() => panel.current && (panel.current.style.transition = ""), 260);
          }}
        >
          <FoodImage
            src={item.image_url}
            alt={item.name}
            sizes="(min-width: 640px) 512px, 100vw"
            eager
            className="aspect-[16/10] w-full"
          />
          <span className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-paper/80 sm:hidden" />
          <button
            onClick={close}
            className="press absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-paper/95 shadow-lift hover:rotate-90 hover:bg-paper"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {off > 0 && (
            <span className="absolute bottom-3 left-4 rounded-full bg-mustard px-3 py-1 text-sm font-bold text-ink animate-pop">
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
                  close();
                }}
                className="press flex h-13 flex-1 items-center justify-between rounded-full bg-basil px-5 font-semibold text-paper shadow-[0_8px_20px_-8px_rgb(30_107_71/0.6)] hover:bg-basil-dark disabled:opacity-40"
              >
                <span>{max === 0 ? "Max in cart" : "Add to order"}</span>
                <span key={qty} className="inline-block tabular-nums animate-pop">{money(effectivePrice(item) * qty)}</span>
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
