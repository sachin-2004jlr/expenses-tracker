"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Apple-store "shelf": a row of tiles that scrolls sideways with snap points, plus round paddle
 * buttons (bottom right) for pointer users. Touch users simply swipe.
 */
export function Shelf({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  const page = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={track}
        onScroll={update}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-6 pt-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <div className="flex justify-end gap-3">
        <PaddleButton label="Previous" disabled={edges.start} onClick={() => page(-1)}>
          <ChevronLeft className="size-5" aria-hidden />
        </PaddleButton>
        <PaddleButton label="Next" disabled={edges.end} onClick={() => page(1)}>
          <ChevronRight className="size-5" aria-hidden />
        </PaddleButton>
      </div>
    </div>
  );
}

function PaddleButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-mist text-ink transition-[background-color,opacity] duration-300 ease-(--ease-apple) hover:bg-silver/70 active:bg-silver focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 dark:bg-muted dark:text-foreground"
    >
      {children}
    </button>
  );
}

/** One tile in a shelf. */
export function ShelfItem({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("w-[min(82vw,22rem)] shrink-0 snap-start", className)}>{children}</li>;
}
