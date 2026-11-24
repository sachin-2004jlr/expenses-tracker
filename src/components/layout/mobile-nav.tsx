"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DASHBOARD_PATH, SAVINGS_ITEM, SETTINGS_ITEM, TRACKER_NAV, isActivePath, isSavingsPath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavPending } from "./nav-pending";
import { useQuickAdd } from "./use-quick-add";

const HOME = TRACKER_NAV.find((item) => item.href === DASHBOARD_PATH)!;
const ACTIVITY = TRACKER_NAV.find((item) => item.href === "/transactions")!;
const MORE_ITEMS: NavItem[] = [...TRACKER_NAV.filter((item) => item !== HOME && item !== ACTIVITY), SETTINGS_ITEM];

/** Bottom tab bar for phones/tablets: Home · Activity · (+) · Savings · More */
export function MobileNav() {
  const pathname = usePathname();
  const quickAdd = useQuickAdd();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isActivePath(pathname, item.href));
  const savings = quickAdd.ledger === "savings";

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 supports-backdrop-filter:bg-background/75 lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
          <TabItem item={HOME} active={isActivePath(pathname, DASHBOARD_PATH)} />
          <TabItem item={ACTIVITY} active={isActivePath(pathname, ACTIVITY.href)} />
          <li className="flex justify-center">
            <button
              type="button"
              onClick={quickAdd.open}
              aria-label={quickAdd.label}
              data-testid="mobile-add"
              className={cn(
                "-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card ring-4 ring-background transition-[transform,background-color] duration-300 ease-(--ease-apple) hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-ring",
                savings && "bg-saved",
              )}
            >
              <Plus className="size-6" aria-hidden />
            </button>
          </li>
          <TabItem item={SAVINGS_ITEM} active={isSavingsPath(pathname)} tone="savings" />
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More navigation"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-normal transition-colors",
                moreActive ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Ellipsis className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription>Calendar, analytics and settings</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-2xl p-4 text-sm font-normal transition-colors duration-300 ease-(--ease-apple) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-silver/60",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.short ?? item.label}
                    <NavPending className="inset-0 rounded-2xl ring-2 ring-ring/50" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between px-4 pt-2">
            <span className="text-sm text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TabItem({ item, active, tone = "tracker" }: { item: NavItem; active: boolean; tone?: "tracker" | "savings" }) {
  const Icon = item.icon;
  const activeText = tone === "savings" ? "text-saved-foreground" : "text-brand";
  return (
    <li>
      <Link
        href={item.href}
        prefetch
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-normal transition-colors",
          active ? activeText : "text-muted-foreground",
        )}
      >
                <Icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden />
        <span>{item.short ?? item.label}</span>
        <NavPending className="left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-ring" />
      </Link>
    </li>
  );
}
