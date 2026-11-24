"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChartColumn, PiggyBank, Target, type LucideIcon } from "lucide-react";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";

const itemClass =
  "group flex w-24 shrink-0 snap-start flex-col items-center gap-3 rounded-2xl py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-28";
const iconClass =
  "flex size-20 items-center justify-center rounded-full bg-card text-ink shadow-card transition-[box-shadow,transform] duration-300 ease-(--ease-apple) group-hover:shadow-card-hover group-active:scale-95 dark:text-foreground sm:size-24";

function Item({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <span className={iconClass}>
        <Icon className="size-8 sm:size-9" strokeWidth={1.25} aria-hidden />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </>
  );
}

/** Apple-store category row ("Mac · iPhone · iPad"), here as the places and actions you use most. */
export function QuickShelf({ month, className }: { month: MonthKey; className?: string }) {
  const { openCreate } = useTransactionDialog();
  const links: { href: string; icon: LucideIcon; label: string }[] = [
    { href: `/transactions?month=${month}`, icon: ArrowLeftRight, label: "Transactions" },
    { href: `/calendar?month=${month}`, icon: CalendarDays, label: "Calendar" },
    { href: `/analytics?month=${month}`, icon: ChartColumn, label: "Analytics" },
    { href: "/settings?tab=budgets", icon: Target, label: "Budgets" },
    { href: "/savings", icon: PiggyBank, label: "Savings" },
  ];
  return (
    <nav aria-label="Shortcuts" className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden", className)}>
      <ul className="flex snap-x gap-4 lg:justify-between">
        <li>
          <button type="button" onClick={() => openCreate({ type: "INCOME" })} className={itemClass}>
            <Item icon={ArrowDownLeft} label="Add income" />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openCreate({ type: "EXPENSE" })} className={itemClass}>
            <Item icon={ArrowUpRight} label="Add expense" />
          </button>
        </li>
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} prefetch className={itemClass}>
              <Item icon={link.icon} label={link.label} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
