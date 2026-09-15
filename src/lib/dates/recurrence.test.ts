import { describe, expect, it } from "vitest";
import { describeFrequency, nextOccurrenceOnOrAfter, occurrenceAt, occurrencesBetween } from "./recurrence";

describe("occurrenceAt", () => {
  it("steps daily, weekly, monthly and yearly", () => {
    expect(occurrenceAt("2026-01-01", "DAILY", 1, 3)).toBe("2026-01-04");
    expect(occurrenceAt("2026-01-01", "WEEKLY", 2, 1)).toBe("2026-01-15");
    expect(occurrenceAt("2026-01-15", "MONTHLY", 1, 2)).toBe("2026-03-15");
    expect(occurrenceAt("2026-01-15", "YEARLY", 1, 1)).toBe("2027-01-15");
  });

  it("clamps month-end anchors and restores them later", () => {
    expect(occurrenceAt("2026-01-31", "MONTHLY", 1, 1)).toBe("2026-02-28");
    expect(occurrenceAt("2024-01-31", "MONTHLY", 1, 1)).toBe("2024-02-29");
    expect(occurrenceAt("2026-01-31", "MONTHLY", 1, 2)).toBe("2026-03-31");
    expect(occurrenceAt("2024-02-29", "YEARLY", 1, 1)).toBe("2025-02-28");
  });
});

describe("nextOccurrenceOnOrAfter", () => {
  it("returns the start date when asked for an earlier date", () => {
    expect(nextOccurrenceOnOrAfter("2026-09-01", "MONTHLY", 1, "2026-01-01")).toBe("2026-09-01");
  });

  it("finds the first occurrence on/after a date", () => {
    expect(nextOccurrenceOnOrAfter("2026-01-05", "MONTHLY", 1, "2026-03-06")).toBe("2026-04-05");
    expect(nextOccurrenceOnOrAfter("2026-01-05", "MONTHLY", 1, "2026-04-05")).toBe("2026-04-05");
    expect(nextOccurrenceOnOrAfter("2026-01-01", "WEEKLY", 1, "2026-01-10")).toBe("2026-01-15");
  });
});

describe("occurrencesBetween", () => {
  it("lists occurrences inside a window honouring the end date", () => {
    expect(occurrencesBetween("2026-01-05", "MONTHLY", 1, "2026-02-01", "2026-05-31")).toEqual([
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
      "2026-05-05",
    ]);
    expect(occurrencesBetween("2026-01-05", "MONTHLY", 1, "2026-02-01", "2026-05-31", "2026-03-31")).toEqual([
      "2026-02-05",
      "2026-03-05",
    ]);
  });

  it("returns nothing when the window is before the start", () => {
    expect(occurrencesBetween("2026-06-01", "DAILY", 1, "2026-01-01", "2026-01-31")).toEqual([]);
  });

  it("is capped by the limit", () => {
    expect(occurrencesBetween("2020-01-01", "DAILY", 1, "2020-01-01", "2026-01-01", null, 10)).toHaveLength(10);
  });
});

describe("describeFrequency", () => {
  it("produces readable labels", () => {
    expect(describeFrequency("MONTHLY", 1)).toBe("Monthly");
    expect(describeFrequency("WEEKLY", 2)).toBe("Every 2 weeks");
  });
});
