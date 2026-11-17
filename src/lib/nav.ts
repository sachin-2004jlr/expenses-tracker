import {
  ArrowLeftRight,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  LayoutGrid,
  List,
  NotebookPen,
  PiggyBank,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short label for the mobile tab bar. */
  short?: string;
}

export const DASHBOARD_PATH = "/dashboard";
export const SAVINGS_PATH = "/savings";

/** The monthly money tracker: income and expenses only. */
export const TRACKER_NAV: NavItem[] = [
  { href: DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, short: "Activity" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
];

/** The savings module: a completely separate ledger with its own pages. */
export const SAVINGS_NAV: NavItem[] = [
  { href: SAVINGS_PATH, label: "Overview", icon: LayoutGrid },
  { href: "/savings/entries", label: "Entries", icon: List },
  { href: "/savings/journal", label: "Journal", icon: NotebookPen },
  { href: "/savings/goals", label: "Goals", icon: Target },
];

export const SAVINGS_ITEM: NavItem = { href: SAVINGS_PATH, label: "Savings", icon: PiggyBank };
export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Every top-level destination (used for page titles). */
export const NAV_ITEMS: NavItem[] = [...TRACKER_NAV, SAVINGS_ITEM, SETTINGS_ITEM];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Exact match for the savings overview so it is not "active" on its sub-pages. */
export function isActiveSavingsPath(pathname: string, href: string): boolean {
  return href === SAVINGS_PATH ? pathname === SAVINGS_PATH : isActivePath(pathname, href);
}

export function isSavingsPath(pathname: string): boolean {
  return isActivePath(pathname, SAVINGS_PATH);
}

/** Title shown in the top bar for the current page. */
export function pageTitle(pathname: string): string {
  if (isSavingsPath(pathname)) {
    const sub = SAVINGS_NAV.find((item) => item.href !== SAVINGS_PATH && isActivePath(pathname, item.href));
    return sub ? `Savings · ${sub.label}` : "Savings";
  }
  return NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label ?? "Expenses";
}

/** Pages that are scoped to a month and therefore show the month selector in the top bar. */
export const MONTH_SCOPED_PATHS = [DASHBOARD_PATH, "/calendar", "/analytics", SAVINGS_PATH];
/** Sub-pages of month-scoped sections where a month makes no sense. */
export const MONTH_AGNOSTIC_PATHS = ["/savings/journal", "/savings/goals"];
