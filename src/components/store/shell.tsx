"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, ShoppingBag, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { useCart } from "./cart";

export function StoreTopBar({ name, isOpen }: { name: string; isOpen: boolean }) {
  const { count, bump } = useCart();
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-md no-print">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />
          <span className="truncate font-display text-lg font-bold tracking-tight">{name}</span>
        </Link>
        <span
          className={clsx(
            "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
            isOpen ? "bg-basil-soft text-basil-dark" : "bg-chili-soft text-chili"
          )}
        >
          <span className={clsx("size-1.5 rounded-full", isOpen ? "bg-basil" : "bg-chili")} />
          {isOpen ? "Open for orders" : "Closed"}
        </span>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <TopLink href="/" active={path === "/"}>Menu</TopLink>
          <TopLink href="/orders" active={path.startsWith("/orders") || path.startsWith("/order/")}>My orders</TopLink>
          <Link
            href="/cart"
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-soft"
          >
            <ShoppingBag className="size-4" />
            Cart
            <span key={bump} className="grid min-w-5 place-items-center rounded-full bg-mustard px-1.5 text-xs text-ink animate-pop">
              {count}
            </span>
          </Link>
        </nav>
        <span
          className={clsx(
            "ml-auto inline-flex size-2.5 rounded-full sm:hidden",
            isOpen ? "bg-basil" : "bg-chili"
          )}
          aria-label={isOpen ? "Open for orders" : "Closed"}
        />
      </div>
    </header>
  );
}

function TopLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-full px-3.5 py-2 text-sm font-medium transition",
        active ? "bg-mist text-ink" : "text-muted hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { count, bump } = useCart();
  const tabs = [
    { href: "/", label: "Menu", icon: UtensilsCrossed, active: path === "/" },
    { href: "/cart", label: "Cart", icon: ShoppingBag, active: path === "/cart" || path === "/checkout", badge: count },
    { href: "/orders", label: "Orders", icon: ReceiptText, active: path.startsWith("/orders") || path.startsWith("/order/") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md pb-safe lg:hidden no-print">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium transition",
              t.active ? "text-basil" : "text-muted"
            )}
          >
            <span className="relative">
              <t.icon className="size-6" strokeWidth={t.active ? 2.25 : 1.75} />
              {!!t.badge && (
                <span
                  key={bump}
                  className="absolute -top-1.5 -right-2.5 grid min-w-[18px] place-items-center rounded-full bg-chili px-1 text-[10px] font-bold text-paper animate-pop"
                >
                  {t.badge}
                </span>
              )}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
