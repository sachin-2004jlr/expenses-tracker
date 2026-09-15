import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  calendarGrid,
  currentMonthKey,
  daysInMonth,
  formatIsoDate,
  formatMonthLabel,
  greetingForHour,
  isLeapYear,
  isValidIsoDate,
  isValidMonthKey,
  listMonthKeys,
  monthRange,
  monthsBetween,
  nextMonthKey,
  previousMonthKey,
  relativeDayLabel,
  startOfWeek,
  todayIso,
  weekDays,
} from "./index";

describe("validation", () => {
  it("accepts real calendar dates only", () => {
    expect(isValidIsoDate("2026-09-15")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2023-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("15-09-2026")).toBe(false);
    expect(isValidIsoDate("2026-9-5")).toBe(false);
    expect(isValidIsoDate(20260915)).toBe(false);
  });

  it("validates month keys", () => {
    expect(isValidMonthKey("2026-09")).toBe(true);
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("2026-9")).toBe(false);
    expect(isValidMonthKey("september")).toBe(false);
  });

  it("knows leap years and month lengths", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("month arithmetic", () => {
  it("moves across year boundaries", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(nextMonthKey("2026-12")).toBe("2027-01");
    expect(addMonths("2026-09", -9)).toBe("2025-12");
    expect(addMonths("2026-09", 15)).toBe("2027-12");
  });

  it("monthRange is inclusive and leap-aware", () => {
    expect(monthRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("listMonthKeys and monthsBetween are ascending", () => {
    expect(listMonthKeys("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(monthsBetween("2025-11", "2026-01")).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(monthsBetween("2026-03", "2026-01")).toEqual([]);
  });
});

describe("day arithmetic", () => {
  it("addDays crosses months and leap days", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("startOfWeek honours the first day of the week", () => {
    // 2026-09-15 is a Tuesday
    expect(startOfWeek("2026-09-15", 1)).toBe("2026-09-14");
    expect(startOfWeek("2026-09-15", 0)).toBe("2026-09-13");
    expect(weekDays("2026-09-15", 1)).toHaveLength(7);
    expect(weekDays("2026-09-15", 1)[6]).toBe("2026-09-20");
  });

  it("calendarGrid always has 6 rows of 7 and contains the month", () => {
    const grid = calendarGrid("2026-09", 1);
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]![0]).toBe("2026-08-31");
    expect(grid.flat()).toContain("2026-09-30");
  });
});

describe("now in a time zone", () => {
  it("resolves today and the month in IST, even around UTC midnight", () => {
    const utcLate = new Date("2026-09-30T20:00:00Z"); // 01:30 IST on 1 Oct
    expect(todayIso("Asia/Kolkata", utcLate)).toBe("2026-10-01");
    expect(currentMonthKey("Asia/Kolkata", utcLate)).toBe("2026-10");
    expect(todayIso("UTC", utcLate)).toBe("2026-09-30");
  });

  it("falls back to the default zone for an invalid one", () => {
    expect(() => todayIso("Not/AZone")).not.toThrow();
  });

  it("greetings by hour", () => {
    expect(greetingForHour(8)).toBe("Good morning");
    expect(greetingForHour(14)).toBe("Good afternoon");
    expect(greetingForHour(19)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good night");
  });
});

describe("formatting", () => {
  it("labels months", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
    expect(formatMonthLabel("2026-09", { style: "short" })).toMatch(/Sep(t)? 2026/);
    expect(formatMonthLabel("2026-01", { style: "month-only" })).toBe("January");
  });

  it("formats dates and relative labels", () => {
    expect(formatIsoDate("2026-09-15")).toBe("15 Sep 2026");
    expect(formatIsoDate("2026-09-15", "dd/MM/yyyy")).toBe("15/09/2026");
    expect(relativeDayLabel("2026-09-15", "2026-09-15")).toBe("Today");
    expect(relativeDayLabel("2026-09-14", "2026-09-15")).toBe("Yesterday");
    expect(relativeDayLabel("2026-09-16", "2026-09-15")).toBe("Tomorrow");
    expect(relativeDayLabel("2026-09-01", "2026-09-15")).toBe("01 Sep 2026");
  });
});
