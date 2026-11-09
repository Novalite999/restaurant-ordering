"use client";

import { useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { effectivePrice, isDiscounted, money } from "@/lib/format";

export function FoodImage({
  src,
  alt,
  className,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center bg-gradient-to-br from-basil-soft to-mustard-soft text-basil/60",
          className
        )}
        aria-hidden
      >
        <UtensilsCrossed className="size-1/4 max-h-10 max-w-10 min-h-5 min-w-5" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    // Plain img keeps admin-pasted URLs from any host working without config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={clsx("object-cover", className)}
    />
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
    "grid place-items-center rounded-full transition active:scale-90 disabled:opacity-30",
    size === "sm" ? "size-8" : "size-11"
  );
  return (
    <div className={clsx("inline-flex items-center rounded-full bg-mist", size === "sm" ? "gap-1 p-0.5" : "gap-2 p-1")}>
      <button type="button" className={clsx(btn, "bg-paper shadow-sm")} onClick={() => onChange(value - 1)} aria-label={`Remove one ${label ?? ""}`}>
        <Minus className="size-4" />
      </button>
      <span className={clsx("min-w-6 text-center font-semibold tabular-nums", size === "md" && "text-lg")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={clsx(btn, "bg-ink text-paper")}
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
