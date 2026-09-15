import { format as formatDateFns, parseISO } from "date-fns";
import type { IsoDate, MonthKey } from "@/types";

/**
 * Date utilities.
 *
 * Transactions store calendar dates as `YYYY-MM-DD` strings. All arithmetic below works on
 * those strings with UTC-based `Date` objects so results never depend on the server timezone.
 */

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in a month. `month` is 1-12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== "string") return false;
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 1900 && year <= 2200 && month >= 1 && month <= 12;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function makeIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year.toString().padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

export function makeMonthKey(year: number, month: number): MonthKey {
  return `${year.toString().padStart(4, "0")}-${pad(month)}`;
}

export function parseIsoDate(iso: IsoDate): { year: number; month: number; day: number } {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const match = MONTH_KEY_PATTERN.exec(key);
  if (!match) throw new RangeError(`Invalid month key: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** "2026-09-15" -> "2026-09" */
export function monthKeyOf(iso: IsoDate): MonthKey {
  return iso.slice(0, 7);
}

export function addMonths(key: MonthKey, count: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + count;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return makeMonthKey(newYear, newMonth);
}

export function previousMonthKey(key: MonthKey): MonthKey {
  return addMonths(key, -1);
}

export function nextMonthKey(key: MonthKey): MonthKey {
  return addMonths(key, 1);
}

/** Inclusive first/last day of a month. */
export function monthRange(key: MonthKey): { start: IsoDate; end: IsoDate } {
  const { year, month } = parseMonthKey(key);
  return {
    start: makeIsoDate(year, month, 1),
    end: makeIsoDate(year, month, daysInMonth(year, month)),
  };
}

/** `count` month keys ending at `endKey`, ascending. */
export function listMonthKeys(endKey: MonthKey, count: number): MonthKey[] {
  const keys: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addMonths(endKey, -i));
  return keys;
}

/** All month keys from `startKey` to `endKey` inclusive, ascending. */
export function monthsBetween(startKey: MonthKey, endKey: MonthKey): MonthKey[] {
  const keys: MonthKey[] = [];
  let current = startKey;
  let guard = 0;
  while (current <= endKey && guard < 2400) {
    keys.push(current);
    current = nextMonthKey(current);
    guard += 1;
  }
  return keys;
}

export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(iso: IsoDate, count: number): IsoDate {
  const { year, month, day } = parseIsoDate(iso);
  const date = new Date(Date.UTC(year, month - 1, day + count));
  return makeIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(iso: IsoDate): number {
  const { year, month, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function startOfWeek(iso: IsoDate, firstDayOfWeek: 0 | 1 = 1): IsoDate {
  const dow = dayOfWeek(iso);
  const diff = (dow - firstDayOfWeek + 7) % 7;
  return addDays(iso, -diff);
}

/** Days of the week containing `iso`, starting on `firstDayOfWeek`. */
export function weekDays(iso: IsoDate, firstDayOfWeek: 0 | 1 = 1): IsoDate[] {
  const start = startOfWeek(iso, firstDayOfWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** A 6-row calendar grid (always 42 cells) for the month, including leading/trailing days. */
export function calendarGrid(key: MonthKey, firstDayOfWeek: 0 | 1 = 1): IsoDate[][] {
  const { start } = monthRange(key);
  const gridStart = startOfWeek(start, firstDayOfWeek);
  const weeks: IsoDate[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: IsoDate[] = [];
    for (let d = 0; d < 7; d += 1) week.push(addDays(gridStart, w * 7 + d));
    weeks.push(week);
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// "Now" in the user's time zone
// ---------------------------------------------------------------------------

function safeTimeZone(timeZone?: string): string {
  const candidate = timeZone || process.env.APP_TIMEZONE || DEFAULT_TIME_ZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Today's calendar date in the given IANA time zone. */
export function todayIso(timeZone?: string, now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function currentMonthKey(timeZone?: string, now: Date = new Date()): MonthKey {
  return monthKeyOf(todayIso(timeZone, now));
}

export function currentHour(timeZone?: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number.parseInt(hour, 10) || 0;
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const monthLabelCache = new Map<string, Intl.DateTimeFormat>();

export function formatMonthLabel(
  key: MonthKey,
  options: { locale?: string; style?: "long" | "short" | "month-only" | "short-month-only" } = {},
): string {
  const { locale = "en-IN", style = "long" } = options;
  const { year, month } = parseMonthKey(key);
  const cacheKey = `${locale}|${style}`;
  let formatter = monthLabelCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      month: style === "long" || style === "month-only" ? "long" : "short",
      year: style === "long" || style === "short" ? "numeric" : undefined,
    });
    monthLabelCache.set(cacheKey, formatter);
  }
  return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Format an ISO date with a date-fns pattern (default "dd MMM yyyy" -> "15 Sep 2026"). */
export function formatIsoDate(iso: IsoDate, pattern = "dd MMM yyyy"): string {
  try {
    return formatDateFns(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

/** "Today" / "Yesterday" / "Tomorrow" or the formatted date. */
export function relativeDayLabel(iso: IsoDate, today: IsoDate, pattern = "dd MMM yyyy"): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return formatIsoDate(iso, pattern);
}

export function weekdayLabels(firstDayOfWeek: 0 | 1 = 1, locale = "en-IN"): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2024-01-07 is a Sunday.
  const base = Date.UTC(2024, 0, 7 + firstDayOfWeek);
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(base + i * 86_400_000)));
}
