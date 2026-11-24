import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./rupee-roll-3d.module.css";

/** Number of vertical slices that make up the cylinder (9° each). */
const SLICES = 40;

/**
 * A rolled ₹500 note, cut out of its photo and rebuilt as a 3D cylinder that turns slowly back and
 * forth. Pure CSS (no JavaScript); it rests facing front under `prefers-reduced-motion`.
 */
export function RupeeRoll3D({ className }: { className?: string }) {
  return (
    <div className={cn(styles.stage, className)} role="img" aria-label="A rolled-up ₹500 note, slowly turning">
      <div className={styles.float}>
        <div className={styles.cylinder} aria-hidden>
          {Array.from({ length: SLICES }, (_, i) => (
            <span key={i} className={styles.slice} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
        <div className={styles.shade} aria-hidden />
        <div className={styles.cap} aria-hidden />
      </div>
      <div className={styles.shadow} aria-hidden />
    </div>
  );
}
