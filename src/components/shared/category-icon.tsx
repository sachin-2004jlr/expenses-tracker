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
 * Category colours map onto six tones of the design-system palette, so every stored colour name
 * still means something while the UI never leaves the palette.
 */
export type PaletteTone = "flame" | "ember" | "link" | "ice" | "graphite" | "ink";

const TONE_OF: Record<string, PaletteTone> = {
  orange: "flame",
  amber: "flame",
  yellow: "flame",
  red: "ember",
  rose: "ember",
  pink: "ember",
  fuchsia: "ember",
  blue: "link",
  indigo: "link",
  emerald: "link",
  green: "link",
  sky: "ice",
  cyan: "ice",
  teal: "ice",
  lime: "ice",
  slate: "graphite",
  violet: "ink",
  purple: "ink",
};

const TONE_CHIP: Record<PaletteTone, string> = {
  flame: "bg-flame/15 text-ember dark:text-flame",
  ember: "bg-ember/10 text-ember dark:bg-ember/25 dark:text-flame",
  link: "bg-link/10 text-link dark:bg-link/25 dark:text-income-foreground",
  ice: "bg-ice/45 text-link dark:bg-ice/15 dark:text-ice",
  graphite: "bg-mist text-graphite dark:bg-muted dark:text-muted-foreground",
  ink: "bg-mist text-ink dark:bg-muted dark:text-foreground",
};

const TONE_SOLID: Record<PaletteTone, string> = {
  flame: "var(--palette-flame)",
  ember: "var(--palette-ember)",
  link: "var(--income)",
  ice: "var(--palette-ice)",
  graphite: "var(--palette-graphite)",
  ink: "var(--net)",
};

/** The six swatches offered in colour pickers (one stored colour name per tone). */
export const COLOR_SWATCHES = [
  { value: "orange", label: "Orange" },
  { value: "red", label: "Burnt orange" },
  { value: "blue", label: "Blue" },
  { value: "sky", label: "Light blue" },
  { value: "slate", label: "Grey" },
  { value: "violet", label: "Ink" },
] as const;

export function categoryTone(color: string): PaletteTone {
  return TONE_OF[color] ?? "graphite";
}

/** Soft background + readable foreground for each stored colour name. */
export const CATEGORY_COLOR_CLASSES: Record<string, string> = Object.fromEntries(
  Object.keys(TONE_OF).map((name) => [name, TONE_CHIP[TONE_OF[name]!]]),
);

/** Solid palette colour for bars and swatches. */
export function categoryColorValue(color: string): string {
  return TONE_SOLID[categoryTone(color)];
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
