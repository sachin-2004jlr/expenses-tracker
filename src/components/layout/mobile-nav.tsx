"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { DASHBOARD_PATH, NAV_ITEMS, isActivePath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const TAB_HREFS = [DASHBOARD_PATH, "/transactions", "/calendar"];
const TABS = TAB_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)!);
const MORE_ITEMS = NAV_ITEMS.filter((item) => !TAB_HREFS.includes(item.href));

/** Bottom tab bar for phones/tablets: Home · Activity · (+) · Calendar · More */
export function MobileNav() {
  const pathname = usePathname();
  const { openCreate } = useTransactionDialog();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/85 lg:hidden"
      >
        <ul className="grid grid-cols-5 items-end">
          <TabItem item={TABS[0]!} active={isActivePath(pathname, DASHBOARD_PATH)} />
          <TabItem item={TABS[1]!} active={isActivePath(pathname, "/transactions")} />
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => openCreate()}
              aria-label="Add transaction"
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow-brand ring-4 ring-background transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-ring"
            >
              <Plus className="size-6" aria-hidden />
            </button>
          </li>
          <TabItem item={TABS[2]!} active={isActivePath(pathname, "/calendar")} />
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More navigation"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
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
            <SheetDescription>Analytics and settings</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3 text-sm font-medium transition-colors",
                      active ? "border-brand/40 bg-brand/10 text-brand" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.short ?? item.label}
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

function TabItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
          active ? "text-brand" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden />
        <span>{item.short ?? item.label}</span>
      </Link>
    </li>
  );
}
