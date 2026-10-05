import {
  Baby,
  Banknote,
  Bell,
  Bike,
  Book,
  Briefcase,
  Bus,
  ChartCandlestick,
  Car,
  Cat,
  Clapperboard,
  Coffee,
  Coins,
  Cpu,
  CreditCard,
  Dog,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Music,
  PartyPopper,
  PiggyBank,
  Pizza,
  Plane,
  Receipt,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Tag,
  Target,
  TrainFront,
  TrendingUp,
  Undo2,
  Users,
  Utensils,
  Vault,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  "party-popper": PartyPopper,
  gift: Gift,
  undo: Undo2,
  coins: Coins,
  banknote: Banknote,
  wallet: Wallet,
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  house: House,
  zap: Zap,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  plane: Plane,
  repeat: Repeat,
  landmark: Landmark,
  users: Users,
  smartphone: Smartphone,
  wifi: Wifi,
  fuel: Fuel,
  dumbbell: Dumbbell,
  baby: Baby,
  store: Store,
  "credit-card": CreditCard,
  "hand-coins": HandCoins,
  shield: Shield,
  cpu: Cpu,
  bell: Bell,
  book: Book,
  coffee: Coffee,
  music: Music,
  pizza: Pizza,
  bus: Bus,
  train: TrainFront,
  bike: Bike,
  dog: Dog,
  cat: Cat,
  gamepad: Gamepad2,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
  vault: Vault,
  gem: Gem,
  "chart-candlestick": ChartCandlestick,
  target: Target,
};

/** Tailwind classes for each category colour token (soft background + readable foreground). */
export const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  slate: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  red: "bg-red-500/12 text-red-600 dark:text-red-400",
  orange: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
  yellow: "bg-yellow-500/14 text-yellow-700 dark:text-yellow-400",
  lime: "bg-lime-500/14 text-lime-700 dark:text-lime-400",
  green: "bg-green-500/12 text-green-700 dark:text-green-400",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  teal: "bg-teal-500/12 text-teal-700 dark:text-teal-400",
  cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-400",
  sky: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  blue: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  indigo: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  purple: "bg-purple-500/12 text-purple-600 dark:text-purple-400",
  fuchsia: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400",
  pink: "bg-pink-500/12 text-pink-600 dark:text-pink-400",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
};

/** Solid colour for charts, resolved from Tailwind's theme variables so it follows the design system. */
export function categoryColorValue(color: string): string {
  const known = color in CATEGORY_COLOR_CLASSES ? color : "slate";
  return `var(--color-${known}-500)`;
}

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON_MAP[name] ?? Tag;
}

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon = CATEGORY_ICON_MAP[icon] ?? Tag;
  const colorClasses = CATEGORY_COLOR_CLASSES[color] ?? CATEGORY_COLOR_CLASSES.slate;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" && "size-6 [&>svg]:size-3",
        size === "md" && "size-8 [&>svg]:size-4",
        size === "lg" && "size-10 [&>svg]:size-5",
        colorClasses,
        className,
      )}
    >
      <Icon />
    </span>
  );
}
