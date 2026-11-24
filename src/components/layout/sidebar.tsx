"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SAVINGS_NAV, SETTINGS_ITEM, TRACKER_NAV, isActivePath, isActiveSavingsPath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavPending } from "./nav-pending";

const noopSubscribe = () => () => {};

type Tone = "tracker" | "savings";

function SidebarLink({ item, active, tone }: { item: NavItem; active: boolean; tone: Tone }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        prefetch
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-full px-3.5 text-sm font-normal transition-[background-color,box-shadow,color] duration-300 ease-(--ease-apple) outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-silver/60",
          active ? "bg-card font-semibold text-foreground shadow-card" : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <Icon
          className={cn("size-[18px] shrink-0", tone === "tracker" ? (active ? "text-brand" : "text-muted-foreground") : active ? "text-saved-foreground" : "text-muted-foreground")}
          aria-hidden
        />
        {item.label}
        <NavPending className="inset-0 rounded-full ring-2 ring-ring/50" />
      </Link>
    </li>
  );
}

function GroupLabel({ children, dot }: { children: string; dot: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 px-3.5 text-xs font-semibold text-muted-foreground">
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {children}
    </p>
  );
}

/**
 * Desktop sidebar. The monthly money tracker and the savings module are two clearly separate
 * groups (orange vs blue) because they are two separate ledgers.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = !mounted || resolvedTheme !== "light";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex">
      <BrandLogo href="/dashboard" className="px-3" />

      <div className="mt-8 flex flex-1 flex-col gap-7 overflow-y-auto">
        <nav aria-label="Money tracker">
          <GroupLabel dot="bg-highlight">Money tracker</GroupLabel>
          <ul className="space-y-0.5">
            {TRACKER_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} tone="tracker" />
            ))}
          </ul>
        </nav>

        <nav aria-label="Savings sections">
          <GroupLabel dot="bg-saved">Savings</GroupLabel>
          <ul className="space-y-0.5">
            {SAVINGS_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActiveSavingsPath(pathname, item.href)} tone="savings" />
            ))}
          </ul>
          <p className="mt-2 px-3.5 text-xs text-muted-foreground">Kept separate. Never counted in your income or expenses.</p>
        </nav>
      </div>

      <ul className="space-y-0.5 border-t border-sidebar-border pt-3">
        <SidebarLink item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} tone="tracker" />
        <li>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-sm font-normal text-sidebar-foreground transition-colors duration-300 ease-(--ease-apple) hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-silver/60 [&>svg]:text-muted-foreground"
          >
            {isDark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
            {isDark ? "Light theme" : "Dark theme"}
          </button>
        </li>
      </ul>
    </aside>
  );
}
