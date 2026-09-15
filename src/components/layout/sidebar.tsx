"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-svh">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-4" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">Expenses</p>
          <p className="text-[11px] text-muted-foreground">Personal finance</p>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_var(--sidebar-border)]"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
        <p className="mt-1 px-2 text-[11px] leading-relaxed text-muted-foreground">
          Data stays in your database. AI runs on your local Ollama.
        </p>
      </div>
    </aside>
  );
}
