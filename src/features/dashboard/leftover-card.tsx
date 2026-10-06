"use client";

import { useState } from "react";
import { ArrowRight, Check, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import type { MonthKey } from "@/types";
import { dismissLeftoverAction, moveLeftoverToSavingsAction } from "./leftover-actions";

/**
 * Shown once at the start of a month: what was left over last month is not carried into this
 * month's balance; move it into Savings with one tap or mark it as already moved.
 */
export function LeftoverCard({ month, amount }: { month: MonthKey; amount: number }) {
  const [busy, setBusy] = useState<"move" | "dismiss" | null>(null);
  const label = formatMonthLabel(month);

  const run = async (kind: "move" | "dismiss") => {
    setBusy(kind);
    try {
      const result = kind === "move" ? await moveLeftoverToSavingsAction(month) : await dismissLeftoverAction(month);
      if (!result.ok) {
        toast.error("Could not update", { description: result.error });
        return;
      }
      if (kind === "move") toast.success("Moved to Savings", { description: `${formatCurrency(amount)} left over from ${label}` });
      else toast.success("Got it", { description: `${label}'s leftover will not be asked about again.` });
    } catch {
      toast.error("Could not reach the server", { description: "Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-saved/30 bg-saved/5 p-4 sm:flex-row sm:items-center sm:p-5"
      aria-label={`Left over from ${label}`}
      data-testid="leftover-card"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-saved/15 text-saved-foreground">
        <PiggyBank className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {label} left you <span className="text-saved-foreground tabular-nums">{formatCurrency(amount)}</span>
        </p>
        <p className="text-sm text-muted-foreground">This month starts from ₹0. Move what was left into Savings, or tell us you already did.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => void run("dismiss")} disabled={busy !== null}>
          <Check data-icon="inline-start" aria-hidden />
          {busy === "dismiss" ? "Saving…" : "Already in savings"}
        </Button>
        <Button size="sm" onClick={() => void run("move")} disabled={busy !== null} className="bg-saved text-white hover:bg-saved/90">
          {busy === "move" ? "Moving…" : "Move to Savings"}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
