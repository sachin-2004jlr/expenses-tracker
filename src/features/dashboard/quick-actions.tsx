"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Sparkles, type LucideIcon } from "lucide-react";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";

export interface QuickActionsProps {
  month: MonthKey;
  className?: string;
}

const tile =
  "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card-elevated px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

function Tile({ icon: Icon, label, highlight, ...props }: { icon: LucideIcon; label: string; highlight?: boolean } & ({ href: string } | { onClick: () => void })) {
  const className = cn(tile, highlight && "border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background");
  const body = (
    <>
      <Icon className="size-5" aria-hidden />
      {label}
    </>
  );
  if ("href" in props) {
    return (
      <Link href={props.href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={className}>
      {body}
    </button>
  );
}

/** 2x2 action tiles like the Deposit / Withdraw / P2P block. */
export function QuickActions({ month, className }: QuickActionsProps) {
  const { openCreate } = useTransactionDialog();
  return (
    <section className={cn("grid grid-cols-2 gap-2", className)} aria-label="Quick actions">
      <Tile icon={ArrowDownToLine} label="Add income" onClick={() => openCreate({ type: "INCOME" })} />
      <Tile icon={ArrowUpFromLine} label="Add expense" highlight onClick={() => openCreate({ type: "EXPENSE" })} />
      <Tile icon={CalendarDays} label="Calendar" href={`/calendar?month=${month}`} />
      <Tile icon={Sparkles} label="Ask AI" href={`/assistant?month=${month}`} />
    </section>
  );
}
