"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";
import type { Settings, AdminUser } from "@/lib/types";
import { addTeamMember, changePassword, saveSettings, setMemberActive, type ActionState } from "@/app/admin/actions";
import { Field, Panel, Switch, btn, input } from "./ui";
import { formatDateTime } from "@/lib/format";

function useToastState(state: ActionState, onOk?: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved");
      onOk?.();
      router.refresh();
    } else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  useToastState(state);
  return (
    <form action={action} className="grid gap-4 xl:grid-cols-2">
      <Panel title="Restaurant">
        <div className="grid gap-3 p-4 sm:p-5">
          <Field label="Name">
            <input name="restaurant_name" defaultValue={s.restaurant_name} className={input} required />
          </Field>
          <Field label="Headline on the menu page" hint="A short line about your food">
            <input name="tagline" defaultValue={s.tagline} className={input} maxLength={90} />
          </Field>
          <Field label="Address (shown for pickup)">
            <input name="address" defaultValue={s.address} className={input} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone">
              <input name="phone" defaultValue={s.phone} className={input} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={s.email} className={input} />
            </Field>
          </div>
        </div>
      </Panel>
      <Panel title="Ordering">
        <div className="grid gap-3 p-4 sm:p-5">
          <Switch name="is_open" defaultChecked={s.is_open} label="Taking online orders" hint="Turn off when the kitchen closes or gets too busy" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch name="pickup_enabled" defaultChecked={s.pickup_enabled} label="Pickup" />
            <Switch name="delivery_enabled" defaultChecked={s.delivery_enabled} label="Delivery" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sales tax rate (%)" hint="Your combined state + local rate">
              <input name="tax_rate" inputMode="decimal" defaultValue={(s.tax_rate_bps / 100).toFixed(2)} className={input} />
            </Field>
            <Field label="Prep time (minutes)" hint="Used for pickup estimates">
              <input name="prep_time_minutes" type="number" min={1} defaultValue={s.prep_time_minutes} className={input} />
            </Field>
            <Field label="Delivery fee ($)">
              <input name="delivery_fee" inputMode="decimal" defaultValue={(s.delivery_fee_cents / 100).toFixed(2)} className={input} />
            </Field>
            <Field label="Minimum order ($)">
              <input name="min_order" inputMode="decimal" defaultValue={(s.min_order_cents / 100).toFixed(2)} className={input} />
            </Field>
          </div>
        </div>
      </Panel>
      <div className="xl:col-span-2">
        <button disabled={pending} className={btn.green}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

export function AddMember() {
  const [state, action, pending] = useActionState(addTeamMember, null);
  const ref = useRef<HTMLFormElement>(null);
  useToastState(state, () => ref.current?.reset());
  return (
    <form ref={ref} action={action} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
      <Field label="Name">
        <input name="name" required className={input} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required className={input} />
      </Field>
      <Field label="Temporary password" hint="At least 10 characters. Share it privately.">
        <input name="password" type="text" minLength={10} required className={input} autoComplete="new-password" />
      </Field>
      <Field label="Role" hint="Owners also manage settings and the team">
        <select name="role" className={input} defaultValue="staff">
          <option value="staff">Staff</option>
          <option value="owner">Owner</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button disabled={pending} className={btn.green}>
          {pending ? "Adding…" : "Add team member"}
        </button>
      </div>
    </form>
  );
}

export function MemberRow({ m, me }: { m: AdminUser; me: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <li className={clsx("flex items-center gap-3 px-4 py-3 sm:px-5", !m.is_active && "opacity-60")}>
      <div className="grid size-9 place-items-center rounded-full bg-basil-soft font-bold text-basil-dark">{m.name[0]?.toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {m.name} {m.id === me && <span className="text-sm font-normal text-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {m.email}, <span className="capitalize">{m.role}</span>, last sign-in {m.last_login_at ? formatDateTime(m.last_login_at) : "never"}
        </p>
      </div>
      {m.id !== me && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setMemberActive(m.id, !m.is_active);
              if (r?.error) toast.error(r.error);
              router.refresh();
            })
          }
          className={btn.ghost}
        >
          {m.is_active ? "Remove access" : "Restore access"}
        </button>
      )}
    </li>
  );
}

export function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useToastState(state, () => ref.current?.reset());
  return (
    <form ref={ref} action={action} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
      <Field label="Current password">
        <input name="current" type="password" required className={input} autoComplete="current-password" />
      </Field>
      <Field label="New password" hint="At least 10 characters">
        <input name="next" type="password" minLength={10} required className={input} autoComplete="new-password" />
      </Field>
      <div className="sm:col-span-2">
        <button disabled={pending} className={btn.primary}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
