"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { Category, MenuItem } from "@/lib/types";
import { saveMenuItem } from "@/app/admin/actions";
import { FoodImage } from "@/components/store/bits";
import { Field, Panel, Switch, btn, input } from "./ui";

const cents = (v: number | null | undefined) => (v == null ? "" : (v / 100).toFixed(2));

export function ItemForm({ item, categories, uploads }: { item?: MenuItem; categories: Category[]; uploads: boolean }) {
  const [state, action, pending] = useActionState(saveMenuItem, null);
  const [preview, setPreview] = useState(item?.image_url ?? "");
  const [price, setPrice] = useState(cents(item?.price_cents));
  const [discount, setDiscount] = useState(cents(item?.discount_price_cents));
  const [track, setTrack] = useState(item?.track_stock ?? true);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const p = Number(price);
  const d = Number(discount);
  const pct = discount && p > 0 && d < p ? Math.round((1 - d / p) * 100) : 0;
  const badDiscount = !!discount && p > 0 && d >= p;

  return (
    <form action={action} className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="space-y-4">
        <Panel title="Details">
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Name" className="sm:col-span-2">
              <input name="name" required defaultValue={item?.name} className={input} placeholder="Classic smash burger" />
            </Field>
            <Field label="Description" className="sm:col-span-2" hint="One or two sentences. Mention key ingredients and allergens.">
              <textarea
                name="description"
                rows={3}
                defaultValue={item?.description}
                className={clsx(input, "h-auto py-2.5")}
                maxLength={600}
              />
            </Field>
            <Field label="Category">
              <select name="category_id" defaultValue={item?.category_id ?? categories[0]?.id ?? ""} className={input}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Calories (optional)">
              <input name="calories" type="number" min={0} defaultValue={item?.calories ?? ""} className={input} />
            </Field>
            <Field label="Tags" className="sm:col-span-2" hint="Comma separated, e.g. spicy, vegan, gluten-free, new, popular">
              <input name="tags" defaultValue={item?.tags?.join(", ")} className={input} />
            </Field>
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Regular price">
              <Money name="price" value={price} onChange={setPrice} required />
            </Field>
            <Field
              label="Discount price (optional)"
              hint={badDiscount ? "Must be lower than the regular price" : pct ? `Customers see ${pct}% off` : "Leave empty for no discount"}
            >
              <Money name="discount_price" value={discount} onChange={setDiscount} invalid={badDiscount} />
            </Field>
          </div>
        </Panel>

        <Panel title="Stock">
          <div className="space-y-3 p-4 sm:p-5">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line px-3.5 py-3">
              <span>
                <span className="block text-[15px] font-medium">Track quantity</span>
                <span className="block text-xs text-muted">Stock goes down with every order. Sells out automatically at zero.</span>
              </span>
              <input type="checkbox" name="track_stock" checked={track} onChange={(e) => setTrack(e.target.checked)} className="mt-1 size-5 accent-basil" />
            </label>
            {track && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Quantity in stock">
                  <input name="stock_quantity" type="number" min={0} step={1} defaultValue={item?.stock_quantity ?? 20} className={input} />
                </Field>
                <Field label="Low-stock alert at" hint="Customers see “Only N left” at or below this">
                  <input name="low_stock_threshold" type="number" min={0} step={1} defaultValue={item?.low_stock_threshold ?? 5} className={input} />
                </Field>
              </div>
            )}
            {!track && <input type="hidden" name="stock_quantity" value={item?.stock_quantity ?? 0} />}
            <Switch name="is_available" defaultChecked={item?.is_available ?? true} label="In stock" hint="Turn off to show it as sold out right away" />
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Photo">
          <div className="space-y-3 p-4 sm:p-5">
            <FoodImage src={preview || null} alt="" className="aspect-[4/3] w-full rounded-2xl" />
            {uploads && (
              <label className={clsx(btn.ghost, "w-full cursor-pointer")}>
                <ImagePlus className="size-4" /> Upload photo
                <input
                  type="file"
                  name="image_file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
            <Field label={uploads ? "Or paste an image link" : "Image link"}>
              <input name="image_url" defaultValue={item?.image_url ?? ""} onChange={(e) => setPreview(e.target.value)} className={input} placeholder="https://…" />
            </Field>
          </div>
        </Panel>
        <Panel title="Visibility">
          <div className="p-4 sm:p-5">
            <Switch name="is_featured" defaultChecked={item?.is_featured} label="Feature on home screen" hint="Shows in Today’s favorites" />
          </div>
        </Panel>
        <div className="flex gap-2 lg:sticky lg:top-6">
          <Link href="/admin/menu" className={clsx(btn.ghost, "flex-1")}>
            Cancel
          </Link>
          <button disabled={pending || badDiscount} className={clsx(btn.green, "flex-1")}>
            {pending ? "Saving…" : item ? "Save changes" : "Add to menu"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Money({
  name,
  value,
  onChange,
  required,
  invalid,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
      <input
        name={name}
        required={required}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder="0.00"
        className={clsx(input, "pl-7 tabular-nums", invalid && "border-chili")}
      />
    </div>
  );
}
