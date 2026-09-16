"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** Narrow icon rail (desktop). Labels live in tooltips; the active item glows orange. */
export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = !mounted || resolvedTheme !== "light";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-sidebar-border bg-sidebar py-4 lg:flex">
      <BrandLogo withText={false} href="/dashboard" />

      <nav aria-label="Primary" className="mt-6 flex flex-1 flex-col items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      active
                        ? "bg-brand/15 text-brand shadow-[0_0_0_1px_color-mix(in_oklch,var(--brand)_35%,transparent),0_10px_30px_-10px_color-mix(in_oklch,var(--brand)_70%,transparent)]"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  />
                }
              >
                <Icon className="size-[18px]" aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="flex size-11 items-center justify-center rounded-xl text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          }
        >
          {isDark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
        </TooltipTrigger>
        <TooltipContent side="right">{isDark ? "Light theme" : "Dark theme"}</TooltipContent>
      </Tooltip>
    </aside>
  );
}
