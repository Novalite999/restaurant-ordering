"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adjustStock } from "@/app/admin/actions";

export function RestockForm({ id, name }: { id: number; name: string }) {
  const [qty, setQty] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(qty);
        if (!Number.isInteger(n) || n === 0) return toast.error("Enter a whole number (use − to remove)");
        start(async () => {
          const r = await adjustStock(id, { delta: n, note: n > 0 ? "Restocked" : "Manual removal" });
          if (r?.error) {
            toast.error(r.error);
            return;
          }
          toast.success(`${name}: now ${r.stock} in stock`);
          setQty("");
          router.refresh();
        });
      }}
    >
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value.replace(/[^\d-]/g, ""))}
        inputMode="numeric"
        placeholder="+ qty"
        aria-label={`Add stock for ${name}`}
        className="h-9 w-20 rounded-lg border border-line px-2.5 text-sm outline-none focus:border-basil"
      />
      <button disabled={pending || !qty} className="h-9 rounded-lg bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40">
        {pending ? "…" : "Update"}
      </button>
    </form>
  );
}
