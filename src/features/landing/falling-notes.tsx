"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { NOTE_BODY_PATHS, NOTE_H, NOTE_SYMBOL_COUNT, NOTE_W, noteSymbolId } from "./note-art";
import styles from "./landing.module.css";

type Layer = "far" | "mid" | "near";

interface Note {
  id: number;
  layer: Layer;
  symbol: number;
  /** Shown on phones too (the rest only from 640px up). */
  mobile: boolean;
  tumble: boolean;
  style: CSSProperties;
}

/** Small seeded PRNG so server and client render the exact same scene. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYER_ORDER: Layer[] = ["near", "mid", "far", "mid", "near", "far", "mid", "far"];

const LAYER_SPEC: Record<Layer, { scale: [number, number]; opacity: [number, number]; duration: [number, number] }> = {
  far: { scale: [0.38, 0.56], opacity: [0.32, 0.5], duration: [15, 21] },
  mid: { scale: [0.62, 0.9], opacity: [0.62, 0.82], duration: [10.5, 14] },
  near: { scale: [0.98, 1.4], opacity: [0.92, 1], duration: [7.5, 10] },
};

function buildNotes(count: number, seed: number, mobileCount: number, center: number, spread: number): Note[] {
  const rand = mulberry32(seed);
  const between = (min: number, max: number) => min + (max - min) * rand();
  const fixed = (n: number, digits = 2) => Number(n.toFixed(digits));
  // Approximate normal distribution: the cascade is a column, dense in the middle.
  const gaussian = () => (rand() + rand() + rand() - 1.5) / 1.5;

  return Array.from({ length: count }, (_, id) => {
    const layer = LAYER_ORDER[id % LAYER_ORDER.length]!;
    const spec = LAYER_SPEC[layer];
    const x = Math.min(95, Math.max(5, center + gaussian() * spread));
    const y0 = between(-14, 34); // some start inside the zone and fade in: thinner at the top
    const y1 = 116;
    // Drift outwards (in % of the zone width) so the cascade widens towards the bottom.
    const drift = (x - center) * between(0.2, 0.55);
    const duration = between(...spec.duration);
    const flutterDuration = between(2.6, 5.2) * (layer === "far" ? 1.4 : 1);
    const settle = between(0.45, 0.95); // where the note rests when motion is reduced
    const tumble = rand() > 0.45;
    const vars: Record<string, string | number> = {
      "--x": `${fixed(x)}%`,
      "--y0": fixed(y0),
      "--y1": y1,
      "--drift": fixed(drift),
      "--s": fixed(between(...spec.scale)),
      "--o": fixed(between(...spec.opacity)),
      "--dur": `${fixed(duration)}s`,
      "--delay": `${fixed(-rand() * duration)}s`,
      "--sway": `${fixed(between(10, 38))}px`,
      "--sdur": `${fixed(between(2.2, 4.4))}s`,
      "--sdelay": `${fixed(-rand() * 4)}s`,
      "--fdur": `${fixed(flutterDuration)}s`,
      "--fdelay": `${fixed(-rand() * flutterDuration)}s`,
      "--rx": `${fixed(between(-60, 60), 1)}deg`,
      "--ry": `${fixed(between(-30, 30), 1)}deg`,
      "--rz": `${fixed(between(-70, 70), 1)}deg`,
      "--still-y": fixed(y0 + (y1 - 22 - y0) * settle),
      "--still-x": fixed(drift * settle),
    };
    return {
      id,
      layer,
      // Distant notes use the warmer palettes so they read as orange, not grey, when dimmed.
      symbol: layer === "far" ? 2 + Math.floor(rand() * (NOTE_SYMBOL_COUNT - 2)) : Math.floor(rand() * NOTE_SYMBOL_COUNT),
      mobile: id < mobileCount,
      tumble,
      style: vars as CSSProperties,
    };
  });
}

const SCENES = {
  hero: buildNotes(40, 20261117, 22, 56, 40),
  cta: buildNotes(18, 50005, 11, 50, 60),
} as const;

export interface FallingNotesProps {
  scene: keyof typeof SCENES;
  className?: string;
}

/**
 * A looping cascade of rupee notes in three depth layers. Each note nests three animated
 * wrappers: fall (Y, linear), sway (X, ease-in-out) and flutter (3D paper rotation), all
 * transform/opacity only. Animations pause while the scene is off screen.
 */
export function FallingNotes({ scene, className }: FallingNotesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const notes = SCENES[scene];

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry && entry.isIntersecting ? "false" : "true";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(styles.zone, className)} aria-hidden data-paused="false">
      <div className={styles.glow} />
      {(["far", "mid", "near"] as const).map((layer) => (
        <div key={layer} className={cn(styles.layer, styles[layer])}>
          {notes
            .filter((note) => note.layer === layer)
            .map((note) => (
              <div key={note.id} className={styles.note} style={note.style} data-mobile={note.mobile ? "true" : "false"}>
                <div className={styles.sway}>
                  <div className={cn(styles.flutter, note.tumble ? styles.tumble : styles.wobble)}>
                    <svg width={NOTE_W} height={NOTE_H} viewBox={`0 0 ${NOTE_W} ${NOTE_H}`} className={styles.art}>
                      <use href={`#${noteSymbolId(note.symbol)}`} />
                    </svg>
                    <div className={styles.shade} style={{ clipPath: `path("${NOTE_BODY_PATHS[note.symbol % NOTE_BODY_PATHS.length]}")` }} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
