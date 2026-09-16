import { ArrowLeftRight, CalendarDays, ChartColumn, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short label for the mobile tab bar. */
  short?: string;
}

export const DASHBOARD_PATH = "/dashboard";

export const NAV_ITEMS: NavItem[] = [
  { href: DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, short: "Activity" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Pages that are scoped to a month and therefore show the month selector in the top bar. */
export const MONTH_SCOPED_PATHS = [DASHBOARD_PATH, "/calendar", "/analytics"];
