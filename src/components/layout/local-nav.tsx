"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MonthSelector } from "@/components/shared/month-selector";
import { isValidMonthKey } from "@/lib/dates";
import { MONTH_AGNOSTIC_PATHS, MONTH_SCOPED_PATHS, SAVINGS_NAV, isActivePath, isActiveSavingsPath, isSavingsPath, pageTitle } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";
import { NavPending } from "./nav-pending";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Apple-style local navigation under the global bar: the page name on the left; the month picker
 * (month-scoped pages) and, inside Savings, its sections on the right.
 */
export function LocalNav({ currentMonth }: { currentMonth: MonthKey }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inSavings = isSavingsPath(pathname);
  const title = inSavings ? "Savings" : pageTitle(pathname);
  const monthScoped =
    MONTH_SCOPED_PATHS.some((path) => isActivePath(pathname, path)) && !MONTH_AGNOSTIC_PATHS.some((path) => isActivePath(pathname, path));
  const monthParam = searchParams.get("month");
  const month = monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonth;

  const savingsLinks = inSavings ? (
    <nav aria-label="Savings sections" className="min-w-0">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {SAVINGS_NAV.map((item) => {
          const active = isActiveSavingsPath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={monthParam ? `${item.href}?month=${monthParam}` : item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors duration-300 ease-(--ease-apple) active:opacity-60",
                  active ? "bg-muted font-semibold text-foreground" : "text-foreground/80 hover:text-link",
                  focusRing,
                )}
              >
                {item.label}
                <NavPending className="inset-0 rounded-full ring-2 ring-ring/50" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  ) : null;

  return (
    <div className="sticky top-12 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150 lg:top-11">
      <div className="mx-auto flex h-13 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <h1 className="min-w-0 truncate font-heading text-lg font-semibold">{title}</h1>
        <div className="flex min-w-0 items-center gap-3">
          {savingsLinks && <div className="hidden md:block">{savingsLinks}</div>}
          {monthScoped && <MonthSelector month={month} currentMonth={currentMonth} size="sm" className="min-w-0" />}
        </div>
      </div>
      {savingsLinks && <div className="mx-auto max-w-6xl px-3 pb-2 sm:px-5 md:hidden">{savingsLinks}</div>}
    </div>
  );
}
