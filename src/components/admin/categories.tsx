"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { Category } from "@/lib/types";
import { deleteCategory, moveCategory, saveCategory, toggleCategory } from "@/app/admin/actions";
import { btn, input } from "./ui";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(saveCategory, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="flex gap-2">
        <input name="name" placeholder="New category, e.g. Breakfast" className={input} required />
        <button disabled={pending} className={clsx(btn.green, "h-11 shrink-0")}>
          Add
        </button>
      </form>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-paper shadow-lift">
        {categories.length === 0 && <li className="px-5 py-10 text-center text-muted">No categories yet.</li>}
        {categories.map((c, i) => (
          <CategoryRow key={c.id} c={c} first={i === 0} last={i === categories.length - 1} />
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({ c, first, last }: { c: Category; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [state, action] = useActionState(saveCategory, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  const run = (fn: () => Promise<{ error?: string } | null>) =>
    start(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      router.refresh();
    });

  return (
    <li className={clsx("flex items-center gap-2 px-3 py-2.5 sm:px-4", pending && "opacity-60", !c.is_active && "bg-mist/50")}>
      <div className="flex flex-col">
        <button disabled={first} onClick={() => run(() => moveCategory(c.id, -1))} className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-20" aria-label="Move up">
          <ArrowUp className="size-4" />
        </button>
        <button disabled={last} onClick={() => run(() => moveCategory(c.id, 1))} className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-20" aria-label="Move down">
          <ArrowDown className="size-4" />
        </button>
      </div>
      {editing ? (
        <form action={action} className="flex flex-1 gap-2">
          <input type="hidden" name="id" value={c.id} />
          <input name="name" defaultValue={c.name} autoFocus className={clsx(input, "h-10")} />
          <button className="grid size-10 shrink-0 place-items-center rounded-xl bg-basil text-paper" aria-label="Save">
            <Check className="size-4" />
          </button>
          <button type="button" onClick={() => setEditing(false)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist" aria-label="Cancel">
            <X className="size-4" />
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={clsx("font-semibold", !c.is_active && "text-muted")}>{c.name}</p>
            <p className="text-xs text-muted">
              {c.item_count} items{!c.is_active && ", hidden from customers"}
            </p>
          </div>
          <IconBtn label="Rename" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </IconBtn>
          <IconBtn label={c.is_active ? "Hide from menu" : "Show on menu"} onClick={() => run(() => toggleCategory(c.id, !c.is_active))}>
            {c.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </IconBtn>
          <IconBtn
            label="Delete"
            danger
            onClick={() => confirm(`Delete the ${c.name} category?`) && run(() => deleteCategory(c.id))}
          >
            <Trash2 className="size-4" />
          </IconBtn>
        </>
      )}
    </li>
  );
}

function IconBtn({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx("grid size-9 place-items-center rounded-lg text-muted", danger ? "hover:bg-chili-soft hover:text-chili" : "hover:bg-mist hover:text-ink")}
    >
      {children}
    </button>
  );
}
