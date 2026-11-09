"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { effectivePrice, isDiscounted, money } from "@/lib/format";

const OPTIMIZABLE = /^https:\/\/(images\.unsplash\.com\/photo-|[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/)/i;

/**
 * Food photo with a soft placeholder, fade-in on load and graceful fallback.
 * Known hosts go through Next's optimizer (resized AVIF/WebP); any other pasted link loads as-is.
 */
export function FoodImage({
  src,
  alt,
  className,
  imgClassName,
  sizes = "120px",
  eager,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Image may finish before hydration; catch that so it never stays invisible.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  const wrap = clsx("relative overflow-hidden bg-gradient-to-br from-basil-soft to-mustard-soft", className);
  if (!src || failed) {
    return (
      <div className={clsx(wrap, "flex items-center justify-center text-basil/60")} aria-hidden>
        <UtensilsCrossed className="size-1/4 max-h-10 max-w-10 min-h-5 min-w-5" strokeWidth={1.5} />
      </div>
    );
  }
  const imgCls = clsx(
    "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 ease-out",
    loaded ? "opacity-100" : "opacity-0",
    imgClassName
  );
  const common = {
    ref,
    onLoad: () => setLoaded(true),
    onError: () => setFailed(true),
    className: imgCls,
  };
  return (
    <div className={wrap}>
      {OPTIMIZABLE.test(src) ? (
        <Image {...common} alt={alt} src={src} fill sizes={sizes} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...common} alt={alt} src={src} loading={eager ? "eager" : "lazy"} decoding="async" />
      )}
    </div>
  );
}

export function Price({
  item,
  className,
  size = "md",
}: {
  item: { price_cents: number; discount_price_cents: number | null };
  className?: string;
  size?: "md" | "lg";
}) {
  const sale = isDiscounted(item);
  return (
    <span className={clsx("inline-flex items-baseline gap-1.5", className)}>
      <span className={clsx("font-semibold tabular-nums", size === "lg" ? "text-xl" : "text-[15px]", sale && "text-chili")}>
        {money(effectivePrice(item))}
      </span>
      {sale && <s className="text-[13px] text-muted tabular-nums">{money(item.price_cents)}</s>}
    </span>
  );
}

export function QtyStepper({
  value,
  onChange,
  max,
  size = "md",
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number | null;
  size?: "sm" | "md";
  label?: string;
}) {
  const atMax = max != null && value >= max;
  const btn = clsx(
    "grid place-items-center rounded-full transition-[transform,background-color,opacity] duration-150 hover:scale-105 active:scale-90 disabled:opacity-30 disabled:hover:scale-100",
    size === "sm" ? "size-8" : "size-11"
  );
  return (
    <div className={clsx("inline-flex items-center rounded-full bg-mist", size === "sm" ? "gap-1 p-0.5" : "gap-2 p-1")}>
      <button type="button" className={clsx(btn, "bg-paper shadow-sm hover:bg-line/50")} onClick={() => onChange(value - 1)} aria-label={`Remove one ${label ?? ""}`}>
        <Minus className="size-4" />
      </button>
      <span className={clsx("min-w-6 text-center font-semibold tabular-nums", size === "md" && "text-lg")} aria-live="polite">
        <span key={value} className="inline-block animate-pop">
          {value}
        </span>
      </span>
      <button
        type="button"
        className={clsx(btn, "bg-ink text-paper hover:bg-ink-soft")}
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label={`Add one ${label ?? ""}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export const TAG_STYLE: Record<string, string> = {
  spicy: "bg-chili-soft text-chili",
  vegan: "bg-basil-soft text-basil-dark",
  vegetarian: "bg-basil-soft text-basil-dark",
  "gluten-free": "bg-sky-soft text-sky",
  new: "bg-mustard-soft text-ink",
  popular: "bg-mustard-soft text-ink",
};

export function Tag({ t }: { t: string }) {
  return (
    <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", TAG_STYLE[t] ?? "bg-mist text-ink-soft")}>
      {t.replace("-", " ")}
    </span>
  );
}
