"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { Category, MenuItem } from "@/lib/types";
import { isDiscounted, money, percentOff } from "@/lib/format";
import { adjustStock, deleteMenuItem, toggleAvailability } from "@/app/admin/actions";
import { FoodImage } from "@/components/store/bits";
import { input } from "./ui";

export function MenuTable({ items, categories }: { items: MenuItem[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "out" | "low">("all");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "all" && String(i.category_id ?? "none") !== cat) return false;
      const out = !i.is_available || (i.track_stock && i.stock_quantity === 0);
      if (filter === "out" && !out) return false;
      if (filter === "low" && !(i.track_stock && i.stock_quantity <= i.low_stock_threshold)) return false;
      return !t || i.name.toLowerCase().includes(t);
    });
  }, [items, q, cat, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className={clsx(input, "pl-9")} />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={clsx(input, "w-auto")}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Uncategorized</option>
        </select>
        <div className="inline-flex rounded-xl bg-paper p-1 shadow-sm">
          {(
            [
              ["all", "All"],
              ["low", "Low stock"],
              ["out", "Out of stock"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={clsx("press rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200", filter === k ? "bg-ink text-paper" : "text-muted hover:text-ink")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-paper px-6 py-14 text-center text-muted shadow-lift">
          {items.length === 0 ? (
            <>
              No items yet.{" "}
              <Link href="/admin/menu/new" className="font-semibold text-basil">
                Add your first dish
              </Link>
            </>
          ) : (
            "No items match these filters."
          )}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {list.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stock, setStock] = useState(item.stock_quantity);
  const [available, setAvailable] = useState(item.is_available);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.stock_quantity));

  const out = !available || (item.track_stock && stock === 0);
  const low = item.track_stock && stock > 0 && stock <= item.low_stock_threshold;

  const changeStock = (opts: { delta?: number; set?: number }) =>
    start(async () => {
      const r = await adjustStock(item.id, opts);
      if (r?.error) {
            toast.error(r.error);
            return;
          }
      setStock(r.stock!);
      setEditing(false);
      router.refresh();
    });

  return (
    <li className={clsx("group lift flex gap-3 rounded-[var(--radius-card)] bg-paper p-3 shadow-lift transition-opacity sm:p-4 animate-fade-in", pending && "opacity-70")}>
      <FoodImage src={item.image_url} alt="" sizes="96px" className="size-20 shrink-0 rounded-2xl sm:size-24" imgClassName="group-hover:scale-105" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold leading-snug">
              {item.is_featured && <Star className="size-3.5 shrink-0 fill-mustard text-mustard" aria-label="Featured" />}
              <span className="truncate">{item.name}</span>
            </p>
            <p className="text-xs text-muted">{item.category_name ?? "Uncategorized"}</p>
          </div>
          <Link href={`/admin/menu/${item.id}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink" aria-label={`Edit ${item.name}`}>
            <Pencil className="size-4" />
          </Link>
          <button
            onClick={() => {
              if (!confirm(`Delete ${item.name} from the menu? Past orders keep their history.`)) return;
              start(async () => {
                await deleteMenuItem(item.id);
                toast.success(`${item.name} deleted`);
                router.refresh();
              });
            }}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-chili-soft hover:text-chili"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-1 flex items-baseline gap-2 text-sm">
          {isDiscounted(item) ? (
            <>
              <span className="font-semibold text-chili tabular-nums">{money(item.discount_price_cents)}</span>
              <s className="text-muted tabular-nums">{money(item.price_cents)}</s>
              <span className="rounded-full bg-mustard-soft px-1.5 text-[11px] font-bold">−{percentOff(item)}%</span>
            </>
          ) : (
            <span className="font-semibold tabular-nums">{money(item.price_cents)}</span>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const next = !available;
                await toggleAvailability(item.id, next);
                setAvailable(next);
                toast.success(next ? `${item.name} is back in stock` : `${item.name} marked out of stock`);
                router.refresh();
              })
            }
            className={clsx(
              "press inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-300 hover:brightness-95",
              out ? "bg-chili-soft text-chili" : "bg-basil-soft text-basil-dark"
            )}
            title={available ? "Click to mark out of stock" : "Click to mark in stock"}
          >
            <span className={clsx("size-1.5 rounded-full", out ? "bg-chili" : "bg-basil")} />
            {!available ? "Out of stock" : out ? "Sold out (0 left)" : "In stock"}
          </button>

          {item.track_stock ? (
            <div className="inline-flex items-center rounded-full bg-mist p-0.5">
              <button disabled={pending || stock === 0} onClick={() => changeStock({ delta: -1 })} className="grid size-7 place-items-center rounded-full bg-paper disabled:opacity-40" aria-label="Remove one">
                <Minus className="size-3.5" />
              </button>
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(draft);
                    if (!Number.isInteger(n) || n < 0) return toast.error("Enter a whole number");
                    changeStock({ set: n });
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => setEditing(false)}
                    inputMode="numeric"
                    className="mx-1 h-7 w-14 rounded-full bg-paper text-center text-sm font-bold outline-none"
                    aria-label="Stock quantity"
                  />
                </form>
              ) : (
                <button
                  onClick={() => {
                    setDraft(String(stock));
                    setEditing(true);
                  }}
                  className={clsx("min-w-16 px-2 text-center text-xs font-bold tabular-nums", low && "text-chili")}
                  title="Set exact quantity"
                >
                  <span key={stock} className="inline-block animate-pop">{stock}</span> in stock
                </button>
              )}
              <button disabled={pending} onClick={() => changeStock({ delta: 1 })} className="grid size-7 place-items-center rounded-full bg-ink text-paper" aria-label="Add one">
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted">Unlimited stock</span>
          )}
        </div>
      </div>
    </li>
  );
}
