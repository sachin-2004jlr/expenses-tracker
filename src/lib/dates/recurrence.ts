import { addDays, compareIsoDates, daysInMonth, makeIsoDate, parseIsoDate } from "./index";
import type { IsoDate, RecurrenceFrequency } from "@/types";

/**
 * Pure recurrence arithmetic for recurring transactions.
 * Monthly/yearly rules keep the anchor day of the start date and clamp to shorter months
 * (a rule starting on 31 Jan runs on 28/29 Feb, then 31 Mar).
 */

export function addMonthsClamped(iso: IsoDate, months: number, anchorDay: number): IsoDate {
  const { year, month } = parseIsoDate(iso);
  const index = year * 12 + (month - 1) + months;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  const day = Math.min(anchorDay, daysInMonth(newYear, newMonth));
  return makeIsoDate(newYear, newMonth, day);
}

/** The n-th occurrence (0-based) of a rule that starts on `startDate`. */
export function occurrenceAt(startDate: IsoDate, frequency: RecurrenceFrequency, interval: number, n: number): IsoDate {
  const step = Math.max(1, interval);
  const anchorDay = parseIsoDate(startDate).day;
  switch (frequency) {
    case "DAILY":
      return addDays(startDate, n * step);
    case "WEEKLY":
      return addDays(startDate, n * step * 7);
    case "MONTHLY":
      return addMonthsClamped(startDate, n * step, anchorDay);
    case "YEARLY":
      return addMonthsClamped(startDate, n * step * 12, anchorDay);
  }
}

/** First occurrence on or after `date` (never before the start date). */
export function nextOccurrenceOnOrAfter(
  startDate: IsoDate,
  frequency: RecurrenceFrequency,
  interval: number,
  date: IsoDate,
): IsoDate {
  if (compareIsoDates(date, startDate) <= 0) return startDate;
  let n = 0;
  let candidate = startDate;
  // Bounded loop: 10k iterations covers ~27 years of daily rules.
  while (compareIsoDates(candidate, date) < 0 && n < 10_000) {
    n += 1;
    candidate = occurrenceAt(startDate, frequency, interval, n);
  }
  return candidate;
}

/** All occurrences in the inclusive window [from, to], honouring an optional end date. */
export function occurrencesBetween(
  startDate: IsoDate,
  frequency: RecurrenceFrequency,
  interval: number,
  from: IsoDate,
  to: IsoDate,
  endDate?: IsoDate | null,
  limit = 400,
): IsoDate[] {
  const result: IsoDate[] = [];
  const upper = endDate && compareIsoDates(endDate, to) < 0 ? endDate : to;
  let candidate = nextOccurrenceOnOrAfter(startDate, frequency, interval, from);
  let n = 0;
  // Find index of candidate to continue stepping without recomputing from scratch.
  while (compareIsoDates(occurrenceAt(startDate, frequency, interval, n), candidate) < 0 && n < 10_000) n += 1;
  while (compareIsoDates(candidate, upper) <= 0 && result.length < limit) {
    result.push(candidate);
    n += 1;
    candidate = occurrenceAt(startDate, frequency, interval, n);
  }
  return result;
}

export function describeFrequency(frequency: RecurrenceFrequency, interval: number): string {
  const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[frequency];
  if (interval <= 1) return { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly" }[frequency];
  return `Every ${interval} ${unit}s`;
}
