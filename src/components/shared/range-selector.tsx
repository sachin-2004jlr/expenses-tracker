"use client";

import { cn } from "@/lib/utils";
import type { RangePreset } from "@/types";

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "12M" },
  { value: "all", label: "All" },
];

export interface RangeSelectorProps {
  value: RangePreset;
  onChange: (value: RangePreset) => void;
  className?: string;
  label?: string;
}

/** Segmented control for 3 / 6 / 12 months / all time. */
export function RangeSelector({ value, onChange, className, label = "Time range" }: RangeSelectorProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex items-center rounded-lg bg-muted p-0.5", className)}>
      {RANGE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 min-w-10 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
