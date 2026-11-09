import clsx from "clsx";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-5 pb-4 animate-rise lg:px-8 lg:pt-8">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[var(--radius-card)] bg-paper shadow-lift", className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="font-display font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-mist text-muted",
  new: "bg-mustard text-ink",
  preparing: "bg-sky-soft text-sky",
  ready: "bg-basil text-paper",
  out_for_delivery: "bg-basil-soft text-basil-dark",
  completed: "bg-mist text-ink-soft",
  cancelled: "bg-chili-soft text-chili",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors duration-300", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  unpaid: "text-muted",
  paid: "text-basil",
  refunded: "text-chili",
  partially_refunded: "text-chili",
  failed: "text-chili",
  expired: "text-muted",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={clsx("text-xs font-semibold whitespace-nowrap", PAY_STYLE[status])}>{PAYMENT_LABEL[status]}</span>;
}

export const btn = {
  primary:
    "press inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-soft disabled:opacity-50",
  green:
    "press inline-flex h-10 items-center justify-center gap-2 rounded-full bg-basil px-4 text-sm font-semibold text-paper hover:bg-basil-dark hover:shadow-[0_8px_18px_-8px_rgb(30_107_71/0.7)] disabled:opacity-50",
  ghost:
    "press inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-semibold hover:border-ink/30 hover:bg-mist/50 disabled:opacity-50",
  danger:
    "press inline-flex h-10 items-center justify-center gap-2 rounded-full bg-chili px-4 text-sm font-semibold text-paper hover:brightness-95 disabled:opacity-50",
};

export const input =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] hover:border-ink/25 focus:border-basil focus:shadow-[0_0_0_4px_rgb(30_107_71/0.12)]";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Switch({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line px-3.5 py-3">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-muted/30 transition peer-checked:bg-basil peer-focus-visible:ring-2 peer-focus-visible:ring-basil after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition-all peer-checked:after:left-[22px]" />
    </label>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
