"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatCurrencyParts } from "@/lib/money";

export interface RollingAmountProps {
  /** Amount in paise. */
  paise: number;
  /** Classes for the rupees part (sign, ₹ and the grouped integer). */
  integerClassName?: string;
  /** Classes for the ".00" part. */
  fractionClassName?: string;
  /** Roll duration in ms. */
  duration?: number;
}

const text = (paise: number) => {
  const p = formatCurrencyParts(Math.round(paise));
  return { integer: `${p.sign}${p.symbol}${p.integer}`, fraction: `.${p.fraction}` };
};

/**
 * A money amount that rolls to its new value when it changes (after adding a transaction, or when
 * switching months), instead of jumping. The first render shows the final value, so server
 * rendering and screen readers always get the real number. Stays instant under reduced motion.
 */
export function RollingAmount({ paise, integerClassName, fractionClassName, duration = 650 }: RollingAmountProps) {
  // React renders the first value once; after that the text is driven directly, frame by frame.
  const [initial] = useState(() => text(paise));
  const integerRef = useRef<HTMLSpanElement>(null);
  const fractionRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(paise);

  // Layout effect: the starting value is written before the browser paints, so nothing flashes.
  useLayoutEffect(() => {
    const from = shown.current;
    const write = (value: number) => {
      const t = text(value);
      if (integerRef.current) integerRef.current.textContent = t.integer;
      if (fractionRef.current) fractionRef.current.textContent = t.fraction;
    };
    if (from === paise) {
      write(paise);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = paise;
      write(paise);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      shown.current = t === 1 ? paise : from + (paise - from) * eased;
      // Whole rupees while rolling, so the paise don't flicker; exact on the last frame.
      write(t === 1 ? paise : Math.round(shown.current / 100) * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    write(from);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // An interrupted roll continues from wherever it got to.
    };
  }, [paise, duration]);

  return (
    <>
      <span ref={integerRef} className={integerClassName}>
        {initial.integer}
      </span>
      <span ref={fractionRef} className={fractionClassName}>
        {initial.fraction}
      </span>
    </>
  );
}
