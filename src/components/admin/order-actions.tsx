"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";
import { Printer } from "lucide-react";
import { advanceOrder, cancelOrderAction, refundAction } from "@/app/admin/actions";
import type { OrderStatus } from "@/lib/types";
import { btn, input } from "./ui";
import { money } from "@/lib/format";

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Send for delivery",
  completed: "Complete",
};

export function AdvanceButtons({
  orderId,
  next,
  size = "md",
  primaryOnly = false,
}: {
  orderId: string;
  next: OrderStatus[];
  size?: "sm" | "md";
  primaryOnly?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (next.length === 0) return null;
  const list = primaryOnly ? next.slice(0, 1) : next;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((s, i) => (
        <button
          key={s}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await advanceOrder(orderId, s);
              if (r?.error) toast.error(r.error);
              else router.refresh();
            })
          }
          className={clsx(i === 0 ? btn.green : btn.ghost, size === "sm" && "h-9 px-3.5", primaryOnly && "w-full")}
        >
          {NEXT_LABEL[s] ?? s}
        </button>
      ))}
    </div>
  );
}

export function CancelOrder({ orderId, paid, status }: { orderId: string; paid: boolean; status: OrderStatus }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelOrderAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Done");
      setOpen(false);
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);
  if (status === "cancelled" || status === "completed") return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className={clsx(btn.ghost, "text-chili")}>
        Cancel order
      </button>
      {open && (
        <Dialog onClose={() => setOpen(false)} title="Cancel this order?">
          <form action={action} className="space-y-3">
            <input type="hidden" name="orderId" value={orderId} />
            <input name="reason" placeholder="Reason (optional, shown in the timeline)" className={input} />
            {paid && (
              <label className="flex items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="refund" defaultChecked className="size-5 accent-basil" /> Refund the full payment to the customer
              </label>
            )}
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" name="restock" defaultChecked={status === "new"} className="size-5 accent-basil" /> Put the items back in stock
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btn.ghost} onClick={() => setOpen(false)}>
                Keep order
              </button>
              <button disabled={pending} className={btn.danger}>
                {pending ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

export function RefundOrder({ orderId, remaining }: { orderId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(refundAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Refunded");
      setOpen(false);
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);
  if (remaining <= 0) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn.ghost}>
        Refund
      </button>
      {open && (
        <Dialog onClose={() => setOpen(false)} title="Issue a refund">
          <form action={action} className="space-y-3">
            <input type="hidden" name="orderId" value={orderId} />
            <p className="text-sm text-muted">Up to {money(remaining)} can be refunded. Leave empty to refund all of it.</p>
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
              <input name="amount" inputMode="decimal" placeholder={(remaining / 100).toFixed(2)} className={clsx(input, "pl-7")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btn.ghost} onClick={() => setOpen(false)}>
                Close
              </button>
              <button disabled={pending} className={btn.danger}>
                {pending ? "Refunding…" : "Refund to card"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btn.ghost}>
      <Printer className="size-4" /> Print ticket
    </button>
  );
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <button className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} aria-label="Close" />
      <div className="relative w-full rounded-t-[24px] bg-paper p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-sheet animate-sheet-up sm:max-w-md sm:rounded-[24px]">
        <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
