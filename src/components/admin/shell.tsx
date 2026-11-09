"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Boxes, CreditCard, ExternalLink, LayoutGrid, LogOut, Menu as MenuIcon, ReceiptText, Settings, Tags, Users,
  UserRound, UtensilsCrossed, Volume2, VolumeX,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { logout, setStoreOpen } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/settings", label: "Settings", icon: Settings, owner: true },
  { href: "/admin/team", label: "Team", icon: Users, owner: true },
  { href: "/admin/more", label: "My account", icon: UserRound },
];

export function AdminShell({
  children,
  user,
  storeName,
  isOpen,
  activeCount,
}: {
  children: React.ReactNode;
  user: { name: string; role: "owner" | "staff" };
  storeName: string;
  isOpen: boolean;
  activeCount: number;
}) {
  const path = usePathname();
  const nav = NAV.filter((n) => !n.owner || user.role === "owner");
  const isActive = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));
  const [count, setCount] = useState(activeCount);
  useEffect(() => setCount(activeCount), [activeCount]);

  return (
    <div className="min-h-dvh bg-mist lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper lg:flex no-print">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-9 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate font-display font-bold leading-tight">{storeName}</p>
            <p className="text-xs text-muted">Restaurant admin</p>
          </div>
        </div>
        <div className="px-3">
          <OpenToggle isOpen={isOpen} />
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "press group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-200",
                isActive(n) ? "bg-ink text-paper" : "text-ink-soft hover:bg-mist hover:text-ink"
              )}
            >
              <n.icon className={clsx("size-[18px] transition-transform duration-200", !isActive(n) && "group-hover:translate-x-0.5 group-hover:scale-110")} />
              {n.label}
              {n.href === "/admin/orders" && count > 0 && (
                <span key={count} className={clsx("ml-auto rounded-full px-2 text-xs font-bold animate-pop", isActive(n) ? "bg-mustard text-ink" : "bg-basil text-paper")}>
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-mist hover:text-ink">
            <ExternalLink className="size-4" /> View storefront
          </Link>
          <div className="mt-1 flex items-center gap-3 px-3 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-basil-soft text-sm font-bold text-basil-dark">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted capitalize">{user.role}</p>
            </div>
            <form action={logout}>
              <button className="grid size-8 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink" aria-label="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 lg:hidden no-print">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />
        <p className="min-w-0 flex-1 truncate font-display font-bold">{storeName}</p>
        <OpenToggle isOpen={isOpen} compact />
      </header>

      <div className="min-w-0 pb-24 lg:pb-10">
        <LiveOrders onCount={setCount} />
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-safe lg:hidden no-print">
        <div className="grid grid-cols-5">
          {[nav[0], nav[1], nav[2], nav[3]].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium transition-colors duration-200 active:scale-95",
                isActive(n) ? "text-basil" : "text-muted"
              )}
            >
              <n.icon className="size-6" strokeWidth={isActive(n) ? 2.25 : 1.75} />
              {n.label}
              {n.href === "/admin/orders" && count > 0 && (
                <span key={count} className="absolute top-1 left-1/2 ml-2 grid min-w-[18px] place-items-center rounded-full bg-chili px-1 text-[10px] font-bold text-paper animate-pop">
                  {count}
                </span>
              )}
            </Link>
          ))}
          <Link
            href="/admin/more"
            className={clsx(
              "flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium",
              ["/admin/more", "/admin/payments", "/admin/categories", "/admin/settings", "/admin/team"].some((p) => path.startsWith(p))
                ? "text-basil"
                : "text-muted"
            )}
          >
            <MenuIcon className="size-6" strokeWidth={1.75} />
            More
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function MoreMenu({ role }: { role: "owner" | "staff" }) {
  const items = NAV.slice(4).filter((n) => n.href !== "/admin/more" && (!n.owner || role === "owner"));
  return (
    <div className="space-y-2">
      {items.map((n) => (
        <Link key={n.href} href={n.href} className="press flex items-center gap-3 rounded-2xl bg-paper p-4 font-medium shadow-lift">
          <n.icon className="size-5 text-basil" />
          {n.label}
        </Link>
      ))}
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-2xl bg-paper p-4 font-medium shadow-lift">
        <LayoutGrid className="size-5 text-basil" /> View storefront
      </Link>
      <form action={logout}>
        <button className="flex w-full items-center gap-3 rounded-2xl bg-paper p-4 font-medium text-chili shadow-lift">
          <LogOut className="size-5" /> Sign out
        </button>
      </form>
    </div>
  );
}

function OpenToggle({ isOpen, compact }: { isOpen: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(isOpen);
  const [pending, start] = useTransition();
  useEffect(() => setOpen(isOpen), [isOpen]);
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !open;
          if (!next && !confirm("Stop taking online orders? Customers will see that you're closed.")) return;
          setOpen(next);
          await setStoreOpen(next);
          toast.success(next ? "Now taking orders" : "Online ordering paused");
        })
      }
      className={clsx(
        "flex items-center gap-2 rounded-full font-semibold transition disabled:opacity-60",
        compact ? "px-3 py-1.5 text-xs" : "w-full justify-between rounded-xl px-3 py-2.5 text-sm",
        open ? "bg-basil-soft text-basil-dark" : "bg-chili-soft text-chili"
      )}
      aria-pressed={open}
    >
      <span className="flex items-center gap-2">
        <span className={clsx("size-2 rounded-full", open ? "bg-basil" : "bg-chili")} />
        {open ? "Taking orders" : "Paused"}
      </span>
      {!compact && (
        <span className={clsx("relative h-5 w-9 rounded-full transition", open ? "bg-basil" : "bg-muted/40")}>
          <span className={clsx("absolute top-0.5 size-4 rounded-full bg-paper shadow transition-all", open ? "left-[18px]" : "left-0.5")} />
        </span>
      )}
    </button>
  );
}

function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.4);
    });
  } catch {}
}

/** Polls for new paid orders; rings and refreshes the current page. */
function LiveOrders({ onCount }: { onCount: (n: number) => void }) {
  const router = useRouter();
  const last = useRef<string | null | undefined>(undefined);
  const [sound, setSound] = useState(true);
  useEffect(() => {
    try {
      setSound(localStorage.getItem("admin.sound") !== "off");
    } catch {}
  }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/admin/orders-feed", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        onCount(d.active_count ?? 0);
        if (last.current !== undefined && d.latest && d.latest !== last.current) {
          if (sound) chime();
          toast.success(`New order #${d.latest_number}`, { duration: 8000 });
          router.refresh();
        }
        last.current = d.latest;
      } catch {}
    };
    tick();
    const t = setInterval(() => !stop && tick(), 10000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router, sound, onCount]);
  return (
    <button
      onClick={() => {
        const next = !sound;
        setSound(next);
        try {
          localStorage.setItem("admin.sound", next ? "on" : "off");
        } catch {}
        if (next) chime();
      }}
      className="press fixed right-4 bottom-24 z-30 grid size-11 place-items-center rounded-full bg-paper text-ink shadow-lift hover:scale-105 lg:bottom-6 no-print"
      aria-label={sound ? "Mute new-order sound" : "Turn on new-order sound"}
      title={sound ? "New-order sound is on" : "New-order sound is off"}
    >
      {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted" />}
    </button>
  );
}
