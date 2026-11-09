import type { OrderStatus, PaymentStatus } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(cents: number | null | undefined) {
  return usd.format((cents ?? 0) / 100);
}

/** The price a customer actually pays for one unit. */
export function effectivePrice(item: { price_cents: number; discount_price_cents: number | null }) {
  const d = item.discount_price_cents;
  return d != null && d < item.price_cents ? d : item.price_cents;
}

export function isDiscounted(item: { price_cents: number; discount_price_cents: number | null }) {
  return item.discount_price_cents != null && item.discount_price_cents < item.price_cents;
}

export function percentOff(item: { price_cents: number; discount_price_cents: number | null }) {
  if (!isDiscounted(item)) return 0;
  return Math.round((1 - item.discount_price_cents! / item.price_cents) * 100);
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  failed: "Failed",
  expired: "Expired",
};

const TZ = process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE || "America/Chicago";

export function formatDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string | Date) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function dollarsToCents(v: FormDataEntryValue | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[$,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}
