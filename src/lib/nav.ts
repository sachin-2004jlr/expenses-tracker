import { ArrowLeftRight, CalendarDays, ChartColumn, LayoutDashboard, Settings, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short label for the mobile tab bar. */
  short?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, short: "Activity" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, short: "Assistant" },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
