"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LogOut, Menu, Plus, Search, Settings, UserRound, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/auth";
import { SAVINGS_NAV, SETTINGS_ITEM, TRACKER_NAV, isActivePath, isSavingsPath } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavPending } from "./nav-pending";
import { useQuickAdd } from "./use-quick-add";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const iconButton = cn(
  "relative flex size-9 items-center justify-center rounded-full text-foreground/80 transition-colors duration-300 ease-(--ease-apple) hover:text-foreground active:opacity-60",
  focusRing,
);

const QUICK_LINKS = [
  { href: "/transactions", label: "All transactions" },
  { href: "/transactions?type=EXPENSE", label: "Expenses only" },
  { href: "/transactions?type=INCOME", label: "Income only" },
  { href: "/savings/entries", label: "Savings entries" },
];

/**
 * Apple-style global navigation: a thin frosted bar with the mark, the sections in one centred
 * row, and search / add / account on the right. Phones get the mark, the icons and a menu button.
 */
export function GlobalNav({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const quickAdd = useQuickAdd();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const displayName = user?.name ?? user?.email ?? "Account";

  // Shortcuts: "n" adds (to the ledger of the current page), "/" opens search, Escape closes it.
  const openAdd = quickAdd.open;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector("[role=dialog], [role=alertdialog], [role=menu], [role=listbox]")) return;
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openAdd();
      } else if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAdd]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setQuery("");
    router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
  };

  const desktopLinks = [...TRACKER_NAV, { ...SAVINGS_NAV[0]!, label: "Savings" }, SETTINGS_ITEM];

  return (
    <>
      <header className="sticky top-0 z-40 h-12 bg-background/80 backdrop-blur-xl backdrop-saturate-150 lg:h-11">
        <nav aria-label="Global" className="mx-auto flex h-full max-w-[1024px] items-center justify-between gap-2 px-4 lg:px-5">
          <BrandLogo withText={false} size="sm" href="/dashboard" className={cn("rounded-full", focusRing)} />

          <ul className="hidden flex-1 items-center justify-evenly lg:flex">
            {desktopLinks.map((item) => {
              const active = item.href === "/savings" ? isSavingsPath(pathname) : isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-2 py-1 text-xs transition-colors duration-300 ease-(--ease-apple) active:opacity-60",
                      active ? "font-semibold text-foreground" : "text-foreground/80 hover:text-foreground",
                      focusRing,
                    )}
                  >
                    {item.label}
                    <NavPending className="inset-x-2 -bottom-0.5 h-px rounded-full bg-foreground/60" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="global-search"
              data-testid="open-search"
              className={iconButton}
            >
              {searchOpen ? <X className="size-[17px]" strokeWidth={1.5} aria-hidden /> : <Search className="size-[17px]" strokeWidth={1.5} aria-hidden />}
            </button>
            <button
              type="button"
              onClick={quickAdd.open}
              aria-label={quickAdd.label}
              title={`${quickAdd.label} (N)`}
              data-testid="add-transaction"
              className={iconButton}
            >
              <Plus className="size-[19px]" strokeWidth={1.5} aria-hidden />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<button type="button" aria-label="Account menu" data-testid="account-menu" className={cn(iconButton, "hidden lg:flex")} />}
              >
                <UserAvatar name={user?.name} email={user?.email} image={user?.image} size="sm" className="size-6 text-xs" />
                <span className="sr-only">{displayName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-1.5rem)]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2 py-2">
                    <UserAvatar name={user?.name} email={user?.email} image={user?.image} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-1.5 py-1 text-sm">
                  <span className="text-muted-foreground">Appearance</span>
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

            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu" aria-haspopup="dialog" aria-expanded={menuOpen} className={cn(iconButton, "lg:hidden")}>
              <Menu className="size-[18px]" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </nav>

        {searchOpen && (
          <div id="global-search" className="absolute inset-x-0 top-full z-40 bg-background shadow-card">
            <div className="mx-auto max-w-[1024px] px-6 pb-10 pt-6 lg:px-12">
              <form onSubmit={submitSearch} role="search" className="flex items-center gap-3">
                <Search className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search transactions"
                  aria-label="Search transactions"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground"
                />
              </form>
              <p className="mt-8 text-xs text-muted-foreground">Quick links</p>
              <ul className="mt-2 space-y-1">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setSearchOpen(false)}
                      className={cn("inline-flex items-center gap-2 rounded-full py-1 text-sm font-semibold text-foreground hover:text-link", focusRing)}
                    >
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </header>
      {searchOpen && (
        <button
          type="button"
          aria-label="Close search"
          tabIndex={-1}
          onClick={() => setSearchOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-ink/20 backdrop-blur-sm"
        />
      )}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="top" className="h-svh max-h-svh gap-0 overflow-y-auto rounded-none bg-background px-0 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-none">
          <SheetHeader className="px-8 pt-14">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Money tracker</SheetDescription>
          </SheetHeader>
          <ul className="px-8">
            {TRACKER_NAV.map((item) => (
              <MenuLink key={item.href} href={item.href} label={item.label} active={isActivePath(pathname, item.href)} onNavigate={() => setMenuOpen(false)} />
            ))}
          </ul>
          <p className="mt-8 px-8 text-xs text-muted-foreground">Savings · kept separate</p>
          <ul className="px-8">
            {SAVINGS_NAV.map((item) => (
              <MenuLink
                key={item.href}
                href={item.href}
                label={item.href === "/savings" ? "Savings" : item.label}
                active={item.href === "/savings" ? pathname === "/savings" : isActivePath(pathname, item.href)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </ul>
          <p className="mt-8 px-8 text-xs text-muted-foreground">Account</p>
          <ul className="px-8">
            <MenuLink href={SETTINGS_ITEM.href} label="Settings" active={isActivePath(pathname, SETTINGS_ITEM.href)} onNavigate={() => setMenuOpen(false)} small />
            <MenuLink href="/settings?tab=account" label={displayName} active={false} onNavigate={() => setMenuOpen(false)} small />
            <li>
              <button type="button" onClick={() => void signOutAction()} className={cn("py-1.5 text-base font-semibold text-foreground", focusRing)}>
                Sign out
              </button>
            </li>
          </ul>
          <div className="mt-8 flex items-center justify-between px-8">
            <span className="text-sm text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MenuLink({ href, label, active, onNavigate, small }: { href: string; label: string; active: boolean; onNavigate: () => void; small?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block py-1.5 font-semibold transition-colors duration-300 ease-(--ease-apple) active:opacity-60",
          small ? "text-base" : "text-2xl",
          active ? "text-foreground" : "text-foreground/80 hover:text-foreground",
          focusRing,
        )}
      >
        {label}
      </Link>
    </li>
  );
}

