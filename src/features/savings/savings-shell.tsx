"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { NavPending } from "@/components/layout/nav-pending";
import { Button } from "@/components/ui/button";
import { SAVINGS_NAV, isActiveSavingsPath } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useSavingsDialog } from "./savings-dialog-provider";

/**
 * Section tabs of the savings module for phones and tablets (the desktop sidebar lists the same
 * sections). Tabs keep the selected month and are prefetched.
 */
export function SavingsTabs() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  return (
    <nav aria-label="Savings sections" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden">
      <ul className="inline-flex min-w-full gap-1 rounded-2xl bg-card shadow-card p-1 sm:min-w-0">
        {SAVINGS_NAV.map((tab) => {
          const Icon = tab.icon;
          const active = isActiveSavingsPath(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1 sm:flex-none">
              <Link
                href={month ? `${tab.href}?month=${month}` : tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active ? "bg-saved/15 text-saved-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="hidden size-4 min-[400px]:block" aria-hidden />
                {tab.label}
                <NavPending className="inset-0 rounded-xl ring-1 ring-saved/50" />
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
      <Button onClick={() => openCreate({ kind: "DEPOSIT" })} className="bg-saved text-white hover:bg-saved/90" data-testid="savings-add">
        <ArrowDownToLine data-icon="inline-start" aria-hidden />
        Add to savings
      </Button>
      <Button onClick={() => openCreate({ kind: "SPEND" })} variant="outline" data-testid="savings-use">
        <ArrowUpFromLine data-icon="inline-start" aria-hidden />
        Used from savings
      </Button>
    </div>
  );
}
