"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, LayoutGrid, List, NotebookPen, Target } from "lucide-react";
import { NavPending } from "@/components/layout/nav-pending";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSavingsDialog } from "./savings-dialog-provider";

const TABS = [
  { href: "/savings", label: "Overview", icon: LayoutGrid },
  { href: "/savings/entries", label: "Entries", icon: List },
  { href: "/savings/journal", label: "Journal", icon: NotebookPen },
  { href: "/savings/goals", label: "Goals", icon: Target },
] as const;

/** Tab bar of the savings module. Tabs keep the selected month and are prefetched. */
export function SavingsTabs() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  return (
    <nav aria-label="Savings sections" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/savings" ? pathname === "/savings" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={month ? `${tab.href}?month=${month}` : tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active ? "bg-saved/12 text-saved-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
                <NavPending className="inset-0 rounded-lg ring-1 ring-saved/50" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "Add to savings" and "Used from savings" buttons. */
export function SavingsAddButtons({ className }: { className?: string }) {
  const { openCreate } = useSavingsDialog();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button onClick={() => openCreate({ kind: "DEPOSIT" })} className="bg-income text-white hover:bg-income/90" data-testid="savings-add">
        <ArrowDownToLine data-icon="inline-start" aria-hidden />
        Add to savings
      </Button>
      <Button onClick={() => openCreate({ kind: "SPEND" })} className="bg-saved text-white hover:bg-saved/90" data-testid="savings-use">
        <ArrowUpFromLine data-icon="inline-start" aria-hidden />
        Used from savings
      </Button>
    </div>
  );
}
