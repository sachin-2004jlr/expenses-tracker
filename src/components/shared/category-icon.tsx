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

/**
 * Apple-style neutral category chips. The stored colour name is kept (backups, imports) but the UI
 * no longer tints by category: icons carry the meaning, the one accent stays blue.
 */
const NEUTRAL_CHIP = "bg-mist text-ink dark:bg-muted dark:text-foreground";

/** Solid colour for a category's bar or swatch: the accent blue. */
export function categoryColorValue(color: string): string {
  void color;
  return "var(--primary)";
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
  void color;
  const colorClasses = NEUTRAL_CHIP;
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
