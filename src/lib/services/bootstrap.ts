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

/** Everything the app shell and pages need for a request. Also materialises due recurring rules. */
export async function loadAppContext(): Promise<AppContext> {
  const userId = await getCurrentUserId();
  const settings = await getSettings(userId);
  const today = todayIso(settings.timeZone);
  await materialiseRecurringOncePerDay(userId, today);
  const [categories, tags] = await Promise.all([listCategories(userId), listTags(userId)]);
  return {
    userId,
    settings,
    categories,
    tagNames: tags.map((t) => t.name),
    today,
    currentMonth: currentMonthKey(settings.timeZone),
  };
}

/** Resolve the `?month=` search param, falling back to the current month. */
export function resolveMonthParam(value: string | string[] | undefined, fallback: MonthKey): MonthKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && isValidMonthKey(candidate) ? candidate : fallback;
}
