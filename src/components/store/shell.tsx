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
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper no-print">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8 rounded-[10px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          <span className="truncate font-display text-lg font-bold tracking-tight">{name}</span>
        </Link>
        <span
          className={clsx(
            "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
            isOpen ? "bg-basil-soft text-basil-dark" : "bg-chili-soft text-chili"
          )}
        >
          <span className="relative flex size-1.5">
            {isOpen && <span className="absolute inset-0 animate-ping rounded-full bg-basil opacity-60 [animation-iteration-count:3]" />}
            <span className={clsx("relative size-1.5 rounded-full", isOpen ? "bg-basil" : "bg-chili")} />
          </span>
          {isOpen ? "Open for orders" : "Closed"}
        </span>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <TopLink href="/" active={path === "/"}>Menu</TopLink>
          <TopLink href="/orders" active={path.startsWith("/orders") || path.startsWith("/order/")}>My orders</TopLink>
          <Link
            href="/cart"
            className="press group ml-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink-soft"
          >
            <ShoppingBag className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
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
        "press rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200",
        active ? "bg-mist text-ink" : "text-muted hover:bg-mist/70 hover:text-ink"
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-safe lg:hidden no-print">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium transition-colors duration-200 active:scale-95",
              t.active ? "text-basil" : "text-muted"
            )}
          >
            {/* Active indicator bar slides between tabs via opacity/scale */}
            <span
              className={clsx(
                "absolute top-0 h-0.5 w-8 rounded-full bg-basil transition-[opacity,transform] duration-300",
                t.active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
              )}
            />
            <span className={clsx("relative transition-transform duration-300", t.active && "-translate-y-0.5")}>
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
