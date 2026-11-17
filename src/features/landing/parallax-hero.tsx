"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface ParallaxHeroProps {
  className?: string;
  children: ReactNode;
}

/**
 * Hero section that feeds pointer position (--px/--py, -1…1, eased) and scroll progress
 * (--sy, 0…1 over the hero height) to CSS. Layers turn those into parallax offsets, so the
 * motion stays on the compositor. Nothing runs when the user prefers reduced motion.
 */
export function ParallaxHero({ className, children }: ParallaxHeroProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let pointerFrame = 0;
    let scrollFrame = 0;

    const ease = () => {
      currentX += (targetX - currentX) * 0.07;
      currentY += (targetY - currentY) * 0.07;
      el.style.setProperty("--px", currentX.toFixed(3));
      el.style.setProperty("--py", currentY.toFixed(3));
      pointerFrame = Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001 ? requestAnimationFrame(ease) : 0;
    };
    const kick = () => {
      if (!pointerFrame) pointerFrame = requestAnimationFrame(ease);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      kick();
    };
    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, el.offsetHeight)));
        el.style.setProperty("--sy", progress.toFixed(3));
      });
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, []);

  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  );
}
