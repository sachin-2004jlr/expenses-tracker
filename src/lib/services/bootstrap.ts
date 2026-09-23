import { cache } from "react";
import { currentMonthKey, isValidMonthKey, todayIso } from "@/lib/dates";
import type { AppSettings, Category, IsoDate, MonthKey } from "@/types";
import { listCategories } from "./categories";
import { materialiseRecurringOncePerDay } from "./recurring";
import { getSettings } from "./settings";
import { listTags } from "./tags";
import { getCurrentUserId } from "./user";

export interface AppContext {
  userId: string;
  settings: AppSettings;
  categories: Category[];
  tagNames: string[];
  today: IsoDate;
  currentMonth: MonthKey;
}

/**
 * Everything the app shell and pages need for a request. Also materialises due recurring rules.
 * Wrapped in React `cache`, so the layout and the page share one load per request instead of
 * querying the database twice.
 */
export const loadAppContext = cache(async (): Promise<AppContext> => {
  const userId = await getCurrentUserId();
  // Settings, categories and tags are independent: one round trip instead of three.
  const [settings, categories, tags] = await Promise.all([getSettings(userId), listCategories(userId), listTags(userId)]);
  const today = todayIso(settings.timeZone);
  // Recurring rules only add transactions (no tags, no categories), so the lists above stay valid.
  await materialiseRecurringOncePerDay(userId, today);
  return {
    userId,
    settings,
    categories,
    tagNames: tags.map((t) => t.name),
    today,
    currentMonth: currentMonthKey(settings.timeZone),
  };
});

/** Resolve the `?month=` search param, falling back to the current month. */
export function resolveMonthParam(value: string | string[] | undefined, fallback: MonthKey): MonthKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && isValidMonthKey(candidate) ? candidate : fallback;
}
