"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { input } from "@/components/admin/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4 rounded-[24px] bg-paper p-6 shadow-sheet animate-modal-in">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && <p className="rounded-xl bg-chili-soft px-3 py-2 text-sm text-chili animate-rise">{state.error}</p>}
      <button disabled={pending} className="press h-12 w-full rounded-full bg-basil font-semibold text-paper hover:bg-basil-dark disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
