"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Plus, Search, Truck, X } from "lucide-react";
import clsx from "clsx";
import type { Category, PublicMenuItem, Settings } from "@/lib/types";
import { money, percentOff } from "@/lib/format";
import { FoodImage, Price, Tag } from "./bits";
import { useCart } from "./cart";
import { ItemSheet } from "./item-sheet";
import { CartLines, EmptyCart } from "./cart-lines";
import { toast } from "sonner";

export function MenuView({
  settings,
  categories,
  items,
}: {
  settings: Settings;
  categories: Category[];
  items: PublicMenuItem[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<PublicMenuItem | null>(null);
  const [active, setActive] = useState<number | null>(categories[0]?.id ?? null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const cart = useCart();
  const canOrder = settings.is_open;

  // Keep the saved cart honest against today's stock and prices.
  const reconciled = useRef(false);
  useEffect(() => {
    if (!cart.ready || reconciled.current) return;
    reconciled.current = true;
    const removed = cart.reconcile(items);
    if (removed.length) toast.warning(`Removed from your cart (sold out): ${removed.join(", ")}`);
  }, [cart, items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => `${i.name} ${i.description} ${i.tags.join(" ")}`.toLowerCase().includes(term));
  }, [q, items]);

  const sections = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: filtered.filter((i) => i.category_id === c.id) }))
        .filter((s) => s.items.length > 0),
    [categories, filtered]
  );
  const featured = useMemo(() => items.filter((i) => i.is_featured && i.in_stock), [items]);

  // Scroll-spy for the category chips
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`cat-${s.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(Number(vis[0].target.getAttribute("data-cat")));
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);

  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  const quickAdd = (item: PublicMenuItem) => {
    if (!canOrder) return setOpen(item);
    const inCart = cart.lines.find((l) => l.id === item.id)?.quantity ?? 0;
    if (item.remaining != null && inCart >= item.remaining) return toast.info(`That's all the ${item.name} we have left.`);
    cart.add(item);
    toast.success(`Added ${item.name}`, { duration: 1500 });
  };

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-4 lg:pt-6">
      <main className="min-w-0">
        {/* Store intro */}
        <section className="bg-paper px-4 pt-5 pb-4 lg:rounded-[var(--radius-card)] lg:p-7 lg:shadow-lift">
          <h1 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-balance">
            {settings.tagline}
          </h1>
          {!settings.is_open && (
            <p className="mt-3 rounded-2xl bg-chili-soft px-4 py-3 text-sm font-medium text-chili">
              We&apos;re not taking online orders right now. You can still browse the menu.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {settings.pickup_enabled && (
              <InfoChip icon={<Clock className="size-4" />}>Pickup in about {settings.prep_time_minutes} min</InfoChip>
            )}
            {settings.delivery_enabled && (
              <InfoChip icon={<Truck className="size-4" />}>Delivery {money(settings.delivery_fee_cents)}</InfoChip>
            )}
            <InfoChip icon={<MapPin className="size-4" />}>{settings.address}</InfoChip>
          </div>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Search dishes, drinks, desserts"
              className="h-12 w-full rounded-full border border-line bg-mist pr-11 pl-12 text-[16px] outline-none transition placeholder:text-muted focus:border-basil focus:bg-paper"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-line" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </label>
        </section>

        {/* Category chips */}
        {!q && sections.length > 1 && (
          <div className="sticky top-14 z-20 border-b border-line/70 bg-mist/95 backdrop-blur-md lg:top-16 lg:mt-4 lg:rounded-full lg:border lg:bg-paper/95">
            <div ref={chipsRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5 lg:px-2 lg:py-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  data-chip={s.id}
                  href={`#cat-${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={clsx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
                    active === s.id ? "bg-ink text-paper" : "bg-paper text-ink-soft hover:text-ink lg:bg-transparent"
                  )}
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Featured */}
        {!q && featured.length > 0 && (
          <section className="pt-6">
            <h2 className="px-4 font-display text-xl font-bold tracking-tight lg:px-0">Today&apos;s favorites</h2>
            <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:px-0">
              {featured.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setOpen(i)}
                  className="group relative w-[74%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-ink text-left text-paper sm:w-[300px]"
                >
                  <FoodImage src={i.image_url} alt={i.name} className="aspect-[4/3] w-full opacity-90 transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                  {percentOff(i) > 0 && (
                    <span className="absolute top-3 left-3 rounded-full bg-mustard px-2.5 py-1 text-xs font-bold text-ink">
                      Save {percentOff(i)}%
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-lg leading-tight font-bold">{i.name}</p>
                    <Price item={i} className="mt-1 [&_s]:text-paper/60 [&>span:first-child]:text-mustard" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sections */}
        {sections.length === 0 && (
          <p className="px-4 py-16 text-center text-muted">
            {q ? <>Nothing matches &ldquo;{q}&rdquo;. Try another word.</> : "The menu is being updated. Check back soon."}
          </p>
        )}
        {sections.map((s) => (
          <section key={s.id} id={`cat-${s.id}`} data-cat={s.id} className="pt-7">
            <h2 className="px-4 font-display text-xl font-bold tracking-tight lg:px-0">{s.name}</h2>
            <div className="mt-3 grid gap-px bg-line sm:gap-3 sm:bg-transparent sm:px-4 md:grid-cols-2 lg:px-0">
              {s.items.map((i) => (
                <ItemRow key={i.id} item={i} onOpen={() => setOpen(i)} onAdd={() => quickAdd(i)} canOrder={canOrder} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Desktop cart */}
      <aside className="hidden lg:block">
        <div className="sticky top-22 rounded-[var(--radius-card)] bg-paper p-5 shadow-lift">
          <h2 className="font-display text-xl font-bold">Your order</h2>
          {cart.lines.length === 0 ? (
            <EmptyCart />
          ) : (
            <>
              <div className="max-h-[52vh] overflow-y-auto pr-1">
                <CartLines compact />
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3 font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(cart.subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-4 flex h-12 items-center justify-center rounded-full bg-basil font-semibold text-paper transition hover:bg-basil-dark"
              >
                Go to checkout
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* Mobile floating cart bar */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-3 pb-2 lg:hidden">
          <Link
            href="/cart"
            className="mx-auto flex h-14 max-w-md items-center justify-between rounded-full bg-basil pr-5 pl-2 text-paper shadow-sheet animate-fade-in"
          >
            <span key={cart.bump} className="grid size-10 place-items-center rounded-full bg-paper/15 font-bold animate-pop">
              {cart.count}
            </span>
            <span className="font-semibold">View cart</span>
            <span className="font-semibold tabular-nums">{money(cart.subtotal)}</span>
          </Link>
        </div>
      )}

      <ItemSheet key={open?.id ?? "none"} item={open} onClose={() => setOpen(null)} canOrder={canOrder} />
    </div>
  );
}

function InfoChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-ink-soft">
      {icon}
      {children}
    </span>
  );
}

function ItemRow({
  item,
  onOpen,
  onAdd,
  canOrder,
}: {
  item: PublicMenuItem;
  onOpen: () => void;
  onAdd: () => void;
  canOrder: boolean;
}) {
  const { lines } = useCart();
  const inCart = lines.find((l) => l.id === item.id)?.quantity ?? 0;
  return (
    <div
      className={clsx(
        "relative flex gap-4 bg-paper p-4 transition sm:rounded-[var(--radius-card)] sm:shadow-lift",
        !item.in_stock && "opacity-60"
      )}
    >
      <button onClick={onOpen} className="absolute inset-0 z-0 sm:rounded-[var(--radius-card)]" aria-label={`View ${item.name}`} />
      <div className="pointer-events-none relative min-w-0 flex-1">
        <h3 className="leading-snug font-semibold">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{item.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Price item={item} />
          {!item.in_stock ? (
            <span className="rounded-full bg-chili-soft px-2 py-0.5 text-[11px] font-semibold text-chili">Sold out</span>
          ) : item.remaining != null ? (
            <span className="rounded-full bg-mustard-soft px-2 py-0.5 text-[11px] font-semibold">Only {item.remaining} left</span>
          ) : null}
          {item.tags.slice(0, 2).map((t) => (
            <Tag key={t} t={t} />
          ))}
        </div>
      </div>
      <div className="relative shrink-0">
        <FoodImage src={item.image_url} alt={item.name} className="pointer-events-none size-26 rounded-2xl sm:size-28" />
        {item.in_stock && canOrder && (
          <button
            onClick={onAdd}
            className={clsx(
              "absolute -right-1.5 -bottom-1.5 z-10 grid h-9 min-w-9 place-items-center rounded-full border-2 border-paper px-2 text-sm font-bold shadow-lift transition active:scale-90",
              inCart ? "bg-basil text-paper" : "bg-paper text-ink"
            )}
            aria-label={`Add ${item.name} to cart`}
          >
            {inCart ? inCart : <Plus className="size-5" strokeWidth={2.5} />}
          </button>
        )}
      </div>
    </div>
  );
}
