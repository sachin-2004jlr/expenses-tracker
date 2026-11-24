"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, LogOut, Plus, Search, Settings, UserRound } from "lucide-react";
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
import type { CurrentUser } from "@/lib/auth";
import { isValidMonthKey } from "@/lib/dates";
import { MONTH_AGNOSTIC_PATHS, MONTH_SCOPED_PATHS, isActivePath, isSavingsPath, pageTitle } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";
import { useQuickAdd } from "./use-quick-add";

export interface AppHeaderProps {
  user: CurrentUser | null;
  currentMonth: MonthKey;
}

/**
 * Top bar: page title and month on the left; search, add and account on the right.
 * Phones show only the month (or title) and the account; adding lives in the bottom bar.
 */
export function AppHeader({ user, currentMonth }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickAdd = useQuickAdd();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const inSavings = isSavingsPath(pathname);

  // Shortcuts: "n" adds (to the ledger of the current page), "/" focuses search. Ignored while typing or when an overlay is open.
  const openAdd = quickAdd.open;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector("[role=dialog], [role=alertdialog], [role=menu], [role=listbox]")) return;
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openAdd();
      } else if (event.key === "/" && searchRef.current && searchRef.current.offsetParent !== null) {
        event.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAdd]);

  const title = pageTitle(pathname);
  const monthScoped =
    MONTH_SCOPED_PATHS.some((path) => isActivePath(pathname, path)) && !MONTH_AGNOSTIC_PATHS.some((path) => isActivePath(pathname, path));
  const monthParam = searchParams.get("month");
  const month = monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonth;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
  };

  const displayName = user?.name ?? user?.email ?? "Account";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:box-content lg:px-8">
        {!monthScoped && (
          <div className="shrink-0 lg:hidden">
            <BrandLogo withText={false} size="sm" href="/dashboard" />
          </div>
        )}

        <h1 className={cn("min-w-0 truncate text-base font-semibold sm:text-lg", monthScoped && "hidden lg:block")}>{title}</h1>

        {monthScoped && <MonthSelector month={month} currentMonth={currentMonth} size="sm" className="min-w-0" />}

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {!inSavings && (
            <form onSubmit={submitSearch} role="search" className="hidden min-w-0 md:block md:w-56 xl:w-72">
              <label className="flex h-9 w-full items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors focus-within:border-ring focus-within:text-foreground">
                <Search className="size-4 shrink-0" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search transactions"
                  aria-label="Search transactions"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {!query && (
                  <kbd className="hidden shrink-0 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground xl:inline" aria-hidden>
                    /
                  </kbd>
                )}
              </label>
            </form>
          )}

          {!inSavings && (
            <Button onClick={quickAdd.open} title="Add transaction (N)" className="hidden shrink-0 rounded-full lg:inline-flex" data-testid="add-transaction">
              <Plus data-icon="inline-start" aria-hidden />
              Add transaction
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  data-testid="account-menu"
                  className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:pr-2.5"
                />
              }
            >
              <UserAvatar name={user?.name} email={user?.email} image={user?.image} size="sm" />
              <span className="hidden max-w-32 truncate font-medium xl:inline">{displayName}</span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-1.5rem)]">
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
        </div>
      </div>
    </header>
  );
}
