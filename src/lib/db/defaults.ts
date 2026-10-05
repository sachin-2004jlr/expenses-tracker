import type { TransactionType } from "@/types";

export interface DefaultCategory {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

/** Default categories seeded for every new user. Icons map to lucide icons in the UI. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Income
  { name: "Salary", type: "INCOME", icon: "briefcase", color: "emerald" },
  { name: "Freelance", type: "INCOME", icon: "laptop", color: "teal" },
  { name: "Bonus", type: "INCOME", icon: "party-popper", color: "lime" },
  { name: "Gift", type: "INCOME", icon: "gift", color: "pink" },
  { name: "Refund", type: "INCOME", icon: "undo", color: "cyan" },
  { name: "Other Income", type: "INCOME", icon: "coins", color: "green" },
  // Expense
  { name: "Food", type: "EXPENSE", icon: "utensils", color: "orange" },
  { name: "Groceries", type: "EXPENSE", icon: "shopping-cart", color: "lime" },
  { name: "Transport", type: "EXPENSE", icon: "car", color: "blue" },
  { name: "Shopping", type: "EXPENSE", icon: "shopping-bag", color: "fuchsia" },
  { name: "Bills", type: "EXPENSE", icon: "receipt", color: "amber" },
  { name: "Rent", type: "EXPENSE", icon: "house", color: "indigo" },
  { name: "Utilities", type: "EXPENSE", icon: "zap", color: "yellow" },
  { name: "Entertainment", type: "EXPENSE", icon: "clapperboard", color: "purple" },
  { name: "Health", type: "EXPENSE", icon: "heart-pulse", color: "rose" },
  { name: "Education", type: "EXPENSE", icon: "graduation-cap", color: "sky" },
  { name: "Travel", type: "EXPENSE", icon: "plane", color: "cyan" },
  { name: "Subscriptions", type: "EXPENSE", icon: "repeat", color: "violet" },
  { name: "EMI", type: "EXPENSE", icon: "landmark", color: "red" },
  { name: "Family", type: "EXPENSE", icon: "users", color: "teal" },
  { name: "Other", type: "EXPENSE", icon: "tag", color: "slate" },
  // Savings destinations (where set-aside money goes)
  { name: "Emergency fund", type: "SAVINGS", icon: "shield", color: "sky" },
  { name: "Mutual funds / SIP", type: "SAVINGS", icon: "trending-up", color: "emerald" },
  { name: "Fixed deposit", type: "SAVINGS", icon: "vault", color: "indigo" },
  { name: "Stocks", type: "SAVINGS", icon: "chart-candlestick", color: "violet" },
  { name: "Gold", type: "SAVINGS", icon: "gem", color: "amber" },
  { name: "PPF / EPF / NPS", type: "SAVINGS", icon: "landmark", color: "teal" },
  { name: "Other savings", type: "SAVINGS", icon: "piggy-bank", color: "pink" },
];

export const CATEGORY_ICONS = [
  "tag",
  "briefcase",
  "laptop",
  "party-popper",
  "gift",
  "undo",
  "coins",
  "banknote",
  "wallet",
  "utensils",
  "shopping-cart",
  "car",
  "shopping-bag",
  "receipt",
  "house",
  "zap",
  "clapperboard",
  "heart-pulse",
  "graduation-cap",
  "plane",
  "repeat",
  "landmark",
  "users",
  "smartphone",
  "wifi",
  "fuel",
  "dumbbell",
  "baby",
  "store",
  "credit-card",
  "hand-coins",
  "shield",
  "cpu",
  "bell",
  "book",
  "coffee",
  "music",
  "pizza",
  "bus",
  "train",
  "bike",
  "dog",
  "cat",
  "gamepad",
  "piggy-bank",
  "trending-up",
  "vault",
  "gem",
  "chart-candlestick",
  "target",
] as const;

export const CATEGORY_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];
