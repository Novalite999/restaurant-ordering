"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock, ShoppingBag, Store, Truck } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { PublicMenuItem, Settings } from "@/lib/types";
import { effectivePrice, money } from "@/lib/format";
import { useCart } from "./cart";
import { FoodImage } from "./bits";

type Fields = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};
const EMPTY: Fields = {
  customer_name: "", customer_phone: "", customer_email: "", address_line1: "", address_line2: "",
  city: "", state: "", zip: "", notes: "",
};
const PROFILE_KEY = "checkout.profile.v1";
const TIPS = [0, 10, 15, 20];

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function CheckoutForm({
  settings,
  items,
  paymentsReady,
}: {
  settings: Settings;
  items: PublicMenuItem[];
  paymentsReady: boolean;
}) {
  const cart = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const [type, setType] = useState<"pickup" | "delivery">(settings.pickup_enabled ? "pickup" : "delivery");
  const [f, setF] = useState<Fields>(EMPTY);
  const [tip, setTip] = useState(15);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const once = useRef(false);

  // Restore saved contact details, reconcile cart, handle a cancelled Stripe payment.
  useEffect(() => {
    if (!cart.ready || once.current) return;
    once.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (saved) setF((p) => ({ ...p, ...saved, notes: "" }));
    } catch {}
    const removed = cart.reconcile(items);
    if (removed.length) toast.warning(`Removed (sold out): ${removed.join(", ")}`);
    const cancelled = params.get("cancelled");
    if (cancelled) {
      fetch("/api/checkout/abandon", { method: "POST", body: JSON.stringify({ orderId: cancelled }) }).catch(() => {});
      toast.info("Payment cancelled. Your cart is still here.");
      router.replace("/checkout");
    }
  }, [cart, items, params, router]);

  const totals = useMemo(() => {
    const subtotal = cart.subtotal;
    const tax = Math.round((subtotal * settings.tax_rate_bps) / 10000);
    const delivery = type === "delivery" ? settings.delivery_fee_cents : 0;
    const tipCents = Math.round((subtotal * tip) / 100);
    const savings = cart.lines.reduce((s, l) => s + (l.price_cents - effectivePrice(l)) * l.quantity, 0);
    return { subtotal, tax, delivery, tip: tipCents, savings, total: subtotal + tax + delivery + tipCents };
  }, [cart.subtotal, cart.lines, settings, type, tip]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = k === "customer_phone" ? formatPhone(e.target.value) : k === "state" ? e.target.value.toUpperCase().slice(0, 2) : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          fulfillment_type: type,
          tip_percent: tip,
          items: cart.lines.map((l) => ({ id: l.id, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data.error ?? "Couldn't place your order.");
        if (res.status === 409) router.refresh();
        setBusy(false);
        return;
      }
      try {
        const { notes: _n, ...profile } = f;
        void _n;
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch {}
      window.location.href = data.url;
    } catch {
      toast.error("Network problem. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-10 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted" />
        <p className="mt-3 font-display text-xl font-bold">Nothing to check out yet</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">
          Browse the menu
        </Link>
      </main>
    );
  }

  const short = settings.min_order_cents - totals.subtotal;
  const blocked = !settings.is_open || !paymentsReady || short > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Cart
      </Link>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Checkout</h1>

      <form onSubmit={submit} className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start" noValidate>
        <div className="space-y-5">
          {settings.pickup_enabled && settings.delivery_enabled && (
            <Card title="How do you want it?">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mist p-1">
                {(["pickup", "delivery"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition",
                      type === t ? "bg-paper shadow-lift" : "text-muted"
                    )}
                    aria-pressed={type === t}
                  >
                    {t === "pickup" ? <Store className="size-5" /> : <Truck className="size-5" />}
                    {t === "pickup" ? "Pickup" : "Delivery"}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                {type === "pickup"
                  ? `Ready in about ${settings.prep_time_minutes} minutes at ${settings.address}.`
                  : `Delivered to your door for ${money(settings.delivery_fee_cents)}.`}
              </p>
            </Card>
          )}

          <Card title="Your details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" error={errors.customer_name} className="sm:col-span-2">
                <input autoComplete="name" value={f.customer_name} onChange={set("customer_name")} />
              </Field>
              <Field label="Mobile phone" error={errors.customer_phone} hint="We'll text you if there's a problem">
                <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(555) 555-5555" value={f.customer_phone} onChange={set("customer_phone")} />
              </Field>
              <Field label="Email" error={errors.customer_email} hint="Your receipt goes here">
                <input type="email" inputMode="email" autoComplete="email" value={f.customer_email} onChange={set("customer_email")} />
              </Field>
            </div>
          </Card>

          {type === "delivery" && (
            <Card title="Delivery address">
              <div className="grid grid-cols-6 gap-3">
                <Field label="Street address" error={errors.address_line1} className="col-span-6">
                  <input autoComplete="address-line1" value={f.address_line1} onChange={set("address_line1")} />
                </Field>
                <Field label="Apt, suite (optional)" className="col-span-6">
                  <input autoComplete="address-line2" value={f.address_line2} onChange={set("address_line2")} />
                </Field>
                <Field label="City" error={errors.city} className="col-span-6 sm:col-span-3">
                  <input autoComplete="address-level2" value={f.city} onChange={set("city")} />
                </Field>
                <Field label="State" error={errors.state} className="col-span-2 sm:col-span-1">
                  <input autoComplete="address-level1" placeholder="TX" value={f.state} onChange={set("state")} />
                </Field>
                <Field label="ZIP" error={errors.zip} className="col-span-4 sm:col-span-2">
                  <input inputMode="numeric" autoComplete="postal-code" value={f.zip} onChange={set("zip")} />
                </Field>
              </div>
            </Card>
          )}

          <Card title="Add a tip">
            <p className="-mt-1 mb-3 text-sm text-muted">100% goes to the kitchen and {type === "delivery" ? "driver" : "counter"} team.</p>
            <div className="grid grid-cols-4 gap-2">
              {TIPS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTip(t)}
                  aria-pressed={tip === t}
                  className={clsx(
                    "rounded-2xl border py-2.5 text-center transition",
                    tip === t ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink/40"
                  )}
                >
                  <span className="block font-semibold">{t === 0 ? "None" : `${t}%`}</span>
                  {t > 0 && <span className={clsx("block text-xs tabular-nums", tip === t ? "text-paper/70" : "text-muted")}>{money(Math.round((totals.subtotal * t) / 100))}</span>}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Notes for the kitchen">
            <Field label="Allergies, special requests (optional)">
              <textarea rows={3} maxLength={500} value={f.notes} onChange={set("notes")} />
            </Field>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-22">
          <Card title="Order summary">
            <ul className="space-y-2.5">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 text-sm">
                  <FoodImage src={l.image_url} alt="" className="size-10 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{l.quantity}×</span> {l.name}
                  </span>
                  <span className="tabular-nums">{money(effectivePrice(l) * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={money(totals.subtotal)} />
              {totals.savings > 0 && <Row label="You save" value={`−${money(totals.savings)}`} className="text-basil" />}
              <Row label={`Sales tax (${(settings.tax_rate_bps / 100).toFixed(2)}%)`} value={money(totals.tax)} />
              {type === "delivery" && <Row label="Delivery fee" value={money(totals.delivery)} />}
              {totals.tip > 0 && <Row label={`Tip (${tip}%)`} value={money(totals.tip)} />}
              <div className="flex justify-between border-t border-line pt-2.5 text-lg font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
            </dl>
            {short > 0 && (
              <p className="mt-3 rounded-xl bg-mustard-soft px-3 py-2 text-sm font-medium">
                Add {money(short)} more to reach the {money(settings.min_order_cents)} minimum.
              </p>
            )}
            {!paymentsReady && (
              <p className="mt-3 rounded-xl bg-chili-soft px-3 py-2 text-sm font-medium text-chili">
                Online payment isn&apos;t switched on yet. Please call {settings.phone} to order.
              </p>
            )}
            <button
              type="submit"
              disabled={blocked || busy || !cart.ready}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-basil text-[17px] font-semibold text-paper transition hover:bg-basil-dark active:scale-[0.99] disabled:opacity-40"
            >
              <Lock className="size-4" />
              {busy ? "Opening secure payment…" : `Pay ${money(totals.total)}`}
            </button>
            <p className="mt-2.5 text-center text-xs text-muted">
              You&apos;ll pay securely with Stripe. Cards, Apple Pay and Google Pay accepted.
            </p>
          </Card>
        </div>
      </form>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-paper p-4 shadow-lift sm:p-5">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-ink-soft">{label}</span>
      <span
        className={clsx(
          "block [&>input]:h-12 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-paper [&>input]:px-3.5 [&>input]:text-[16px] [&>input]:outline-none [&>input]:transition",
          "[&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:px-3.5 [&>textarea]:py-3 [&>textarea]:text-[16px] [&>textarea]:outline-none",
          error
            ? "[&>input]:border-chili [&>textarea]:border-chili"
            : "[&>input]:border-line [&>input]:focus:border-basil [&>textarea]:border-line [&>textarea]:focus:border-basil"
        )}
      >
        {children}
      </span>
      {error ? (
        <span className="mt-1 block text-sm text-chili">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={clsx("flex justify-between", className)}>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
