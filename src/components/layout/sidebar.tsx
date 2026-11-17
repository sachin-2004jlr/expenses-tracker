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
          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          active
            ? tone === "tracker"
              ? "bg-brand/12 text-foreground"
              : "bg-saved/12 text-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
        )}
      >
        {active && <span className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full", tone === "tracker" ? "bg-brand" : "bg-saved")} aria-hidden />}
        <Icon
          className={cn("size-[18px] shrink-0", active && (tone === "tracker" ? "text-brand" : "text-saved-foreground"))}
          aria-hidden
        />
        {item.label}
        <NavPending className={cn("inset-0 rounded-xl ring-2", tone === "tracker" ? "ring-brand/50" : "ring-saved/50")} />
      </Link>
    </li>
  );
}

function GroupLabel({ children, dot }: { children: string; dot: string }) {
  return (
    <p className="mb-1.5 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {children}
    </p>
  );
}

/**
 * Desktop sidebar. The monthly money tracker and the savings module are two clearly separate
 * groups (orange vs sky) because they are two separate ledgers.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = !mounted || resolvedTheme !== "light";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
      <BrandLogo href="/dashboard" className="px-2" />

      <div className="mt-8 flex flex-1 flex-col gap-7 overflow-y-auto">
        <nav aria-label="Money tracker">
          <GroupLabel dot="bg-brand">Money tracker</GroupLabel>
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
          <p className="mt-2 px-3 text-[11px] leading-relaxed text-muted-foreground">Kept separate. Never counted in your income or expenses.</p>
        </nav>
      </div>

      <ul className="space-y-0.5 border-t border-sidebar-border pt-3">
        <SidebarLink item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} tone="tracker" />
        <li>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {isDark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
            {isDark ? "Light theme" : "Dark theme"}
          </button>
        </li>
      </ul>
    </aside>
  );
}
