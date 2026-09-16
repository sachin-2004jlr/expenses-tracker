"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ChevronDown, LogOut, Plus, Search, Settings, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/shared/brand-logo";
import { MonthSelector } from "@/components/shared/month-selector";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOutAction } from "@/features/auth/actions";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import type { CurrentUser } from "@/lib/auth";
import { isValidMonthKey } from "@/lib/dates";
import { MONTH_SCOPED_PATHS, NAV_ITEMS, isActivePath } from "@/lib/nav";
import type { MonthKey } from "@/types";

export interface AppHeaderProps {
  user: CurrentUser | null;
  currentMonth: MonthKey;
}

export function AppHeader({ user, currentMonth }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCreate } = useTransactionDialog();
  const [query, setQuery] = useState("");

  const current = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
  const monthScoped = MONTH_SCOPED_PATHS.some((path) => isActivePath(pathname, path));
  const monthParam = searchParams.get("month");
  const month = monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonth;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
  };

  const displayName = user?.name ?? user?.email ?? "Account";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:gap-3 sm:px-5 lg:px-6">
      <div className="lg:hidden">
        <BrandLogo withText={false} size="sm" href="/dashboard" />
      </div>

      {monthScoped ? (
        <MonthSelector month={month} currentMonth={currentMonth} size="sm" className="rounded-full bg-card" />
      ) : (
        <h1 className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold">{current?.label ?? "Expenses"}</h1>
      )}

      <Button size="icon" onClick={() => openCreate()} aria-label="Add transaction" className="rounded-full shadow-glow-brand" data-testid="add-transaction">
        <Plus aria-hidden />
      </Button>

      <form onSubmit={submitSearch} role="search" className="ml-auto hidden min-w-0 md:block">
        <label className="flex h-9 w-56 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors focus-within:border-ring focus-within:text-foreground lg:w-72">
          <Search className="size-4 shrink-0" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions…"
            aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
      </form>

      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/transactions" />} className="hidden rounded-full md:inline-flex">
        View all
      </Button>

      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/assistant" />} className="hidden rounded-full xl:inline-flex" aria-label="AI assistant">
        <Sparkles data-icon="inline-start" className="text-brand" aria-hidden />
        Assistant
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Account menu"
              data-testid="account-menu"
              className="ml-auto flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:ml-0"
            />
          }
        >
          <UserAvatar name={user?.name} email={user?.email} image={user?.image} size="sm" />
          <span className="hidden max-w-32 truncate font-medium sm:inline">{displayName}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 py-2">
              <UserAvatar name={user?.name} email={user?.email} image={user?.image} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-1.5 py-1 text-sm">
            <span className="text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <DropdownMenuItem onClick={() => router.push("/settings?tab=account")}>
            <UserRound aria-hidden />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void signOutAction()} data-testid="sign-out">
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
