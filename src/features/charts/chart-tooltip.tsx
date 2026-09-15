"use client";

import { formatCurrency } from "@/lib/money";

export interface ChartTooltipItem {
  name: string;
  value: number;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  items?: ChartTooltipItem[];
  /** Override the label shown at the top. */
  title?: string;
  footer?: string;
}

/** Tooltip surface shared by all charts: text tokens for copy, a colour swatch for identity. */
export function ChartTooltipContent({ active, label, items = [], title, footer }: ChartTooltipProps) {
  if (!active || items.length === 0) return null;
  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{title ?? label}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {item.color && <span className="size-2 rounded-sm" style={{ background: item.color }} aria-hidden />}
              {item.name}
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</p>}
    </div>
  );
}
