"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { PublicMenuItem } from "@/lib/types";
import { percentOff } from "@/lib/format";
import { FoodImage, Price } from "./bits";

const INTERVAL = 3800; // ms each card stays before sliding on
const RESUME_AFTER = 5000; // ms of no touching before it starts moving again

/**
 * "Today's favorites": a swipeable row that glides to the next dish on its own.
 * It pauses while the customer hovers, touches, focuses it, scrolls it away, or switches tabs,
 * and stays still for anyone who has reduced motion turned on.
 */
export function FeaturedCarousel({ items, onOpen }: { items: PublicMenuItem[]; onOpen: (i: PublicMenuItem) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [overflowing, setOverflowing] = useState(true);
  const [reduced, setReduced] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = !paused && visible && overflowing && !reduced && items.length > 1;

  const cards = () => Array.from(track.current?.children ?? []) as HTMLElement[];

  const goTo = useCallback((idx: number) => {
    const el = track.current;
    const list = Array.from(el?.children ?? []) as HTMLElement[];
    if (!el || list.length === 0) return;
    const i = ((idx % list.length) + list.length) % list.length;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    el.scrollTo({ left: list[i].offsetLeft - el.offsetLeft - pad, behavior: "smooth" });
  }, []);

  // Pause now, resume after a quiet period (touch / arrow / dot).
  const nudge = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER);
  }, []);

  // Track which card is in view.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const list = cards();
        const left = el.scrollLeft;
        let best = 0;
        let bestD = Infinity;
        list.forEach((c, i) => {
          const d = Math.abs(c.offsetLeft - el.offsetLeft - left - (parseFloat(getComputedStyle(el).paddingLeft) || 0));
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        // At the far right edge, the last card counts as active.
        if (left + el.clientWidth >= el.scrollWidth - 4) best = list.length - 1;
        setActive(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Only move when it's on screen, the tab is visible, and there's somewhere to move to.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden), { threshold: 0.4 });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => setOverflowing(el.scrollWidth > el.clientWidth + 4));
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", onMq);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  // The auto-advance itself.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => goTo(active + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [running, active, goTo]);

  return (
    <div
      className="group/carousel relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      onTouchStart={nudge}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={track}
        className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 lg:px-0"
        aria-roledescription="carousel"
        aria-label="Today's favorites"
      >
        {items.map((i, idx) => (
          <button
            key={i.id}
            onClick={() => onOpen(i)}
            style={{ "--i": idx + 3 } as React.CSSProperties}
            aria-roledescription="slide"
            aria-label={`${i.name}, ${idx + 1} of ${items.length}`}
            className={clsx(
              "reveal lift press group relative w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-ink text-left text-paper transition-[opacity,transform] duration-500 sm:w-[300px]",
              overflowing && idx !== active && "max-sm:opacity-80"
            )}
          >
            <FoodImage
              src={i.image_url}
              alt={i.name}
              sizes="300px"
              eager={idx < 2}
              className="aspect-[4/3] w-full"
              imgClassName="group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
            {percentOff(i) > 0 && (
              <span className="absolute top-3 left-3 rounded-full bg-mustard px-2.5 py-1 text-xs font-bold text-ink">
                Save {percentOff(i)}%
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="font-display text-lg leading-tight font-bold">{i.name}</p>
              <Price item={i} className="mt-1 [&_s]:text-paper/60 [&>span:first-child]:text-mustard" />
            </div>
          </button>
        ))}
      </div>

      {overflowing && items.length > 1 && (
        <>
          {/* Desktop arrows, shown on hover */}
          <button
            onClick={() => {
              nudge();
              goTo(active - 1);
            }}
            className="press absolute top-[calc(50%-12px)] left-2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/95 text-ink opacity-0 shadow-lift transition-opacity duration-200 group-hover/carousel:opacity-100 hover:bg-paper focus-visible:opacity-100 sm:grid lg:-left-4"
            aria-label="Previous dish"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => {
              nudge();
              goTo(active + 1);
            }}
            className="press absolute top-[calc(50%-12px)] right-2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/95 text-ink opacity-0 shadow-lift transition-opacity duration-200 group-hover/carousel:opacity-100 hover:bg-paper focus-visible:opacity-100 sm:grid lg:-right-4"
            aria-label="Next dish"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Position dots; the active one fills up until the next slide */}
          <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Choose a favorite">
            {items.map((i, idx) => (
              <button
                key={i.id}
                role="tab"
                aria-selected={idx === active}
                aria-label={`Show ${i.name}`}
                onClick={() => {
                  nudge();
                  goTo(idx);
                }}
                className={clsx(
                  "relative h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300",
                  idx === active ? "w-7 bg-line" : "w-1.5 bg-line hover:bg-muted/50"
                )}
              >
                {idx === active && (
                  <span
                    key={`${active}-${running}`}
                    className="absolute inset-0 origin-left rounded-full bg-basil"
                    style={
                      running
                        ? { animation: `grow-x ${INTERVAL}ms linear both` }
                        : { transform: "scaleX(1)" }
                    }
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
