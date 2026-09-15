import { describe, expect, it } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatSignedAmount,
  paiseToDecimalString,
  paiseToRupees,
  parseMoney,
  rupeesToPaise,
  sumPaise,
} from "./index";

describe("rupeesToPaise", () => {
  it("converts whole and fractional rupees without floating point", () => {
    expect(rupeesToPaise("55000")).toBe(5_500_000);
    expect(rupeesToPaise("850.5")).toBe(85_050);
    expect(rupeesToPaise("0.05")).toBe(5);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("1.10")).toBe(110);
    expect(rupeesToPaise(19.99)).toBe(1_999);
  });

  it("rounds a third decimal half-up", () => {
    expect(rupeesToPaise("1.005")).toBe(101);
    expect(rupeesToPaise("1.004")).toBe(100);
  });

  it("handles the classic 0.1 + 0.2 trap", () => {
    expect(rupeesToPaise("0.1") + rupeesToPaise("0.2")).toBe(30);
  });

  it("rejects out-of-range amounts", () => {
    expect(() => rupeesToPaise("99999999999999999")).toThrow(RangeError);
  });
});

describe("parseMoney", () => {
  it("accepts Indian-formatted input", () => {
    expect(parseMoney("₹1,24,500")).toBe(12_450_000);
    expect(parseMoney("55,000")).toBe(5_500_000);
    expect(parseMoney(" 850.50 ")).toBe(85_050);
    expect(parseMoney("Rs. 300")).toBe(30_000);
    expect(parseMoney(850)).toBe(85_000);
  });

  it("rejects garbage, negatives and more than two decimals", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-100")).toBeNull();
    expect(parseMoney("1.234")).toBeNull();
    expect(parseMoney("1e5")).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(Number.NaN)).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("uses Indian digit grouping and drops .00 for whole rupees", () => {
    expect(formatCurrency(12_450_000)).toBe("₹1,24,500");
    expect(formatCurrency(5_500_000)).toBe("₹55,000");
    expect(formatCurrency(85_000)).toBe("₹850");
  });

  it("shows paise when present", () => {
    expect(formatCurrency(85_050)).toBe("₹850.50");
    expect(formatCurrency(5_500_000, { alwaysShowDecimals: true })).toBe("₹55,000.00");
  });

  it("formats negatives and signs", () => {
    expect(formatCurrency(-85_000)).toBe("-₹850");
    expect(formatCurrency(85_000, { signDisplay: "always" })).toBe("+₹850");
  });

  it("formats very large amounts", () => {
    expect(formatCurrency(1_00_00_00_000 * 100)).toBe("₹1,00,00,00,000");
  });

  it("signed amounts use + and − by type", () => {
    expect(formatSignedAmount(5_500_000, "INCOME")).toBe("+ ₹55,000");
    expect(formatSignedAmount(85_000, "EXPENSE")).toBe("− ₹850");
  });

  it("compact notation uses K / L / Cr", () => {
    expect(formatCompactCurrency(5_500_000)).toBe("₹55K");
    expect(formatCompactCurrency(12_450_000)).toBe("₹1.2L");
    expect(formatCompactCurrency(2_50_00_000 * 100)).toBe("₹2.5Cr");
    expect(formatCompactCurrency(85_000)).toBe("₹850");
    expect(formatCompactCurrency(-5_500_000)).toBe("-₹55K");
    expect(formatCurrency(5_500_000, { compact: true })).toBe("₹55K");
  });
});

describe("helpers", () => {
  it("paiseToRupees / paiseToDecimalString", () => {
    expect(paiseToRupees(85_050)).toBe(850.5);
    expect(paiseToDecimalString(5_500_000)).toBe("55000.00");
    expect(paiseToDecimalString(5)).toBe("0.05");
    expect(paiseToDecimalString(-85_050)).toBe("-850.50");
  });

  it("formatPercent", () => {
    expect(formatPercent(69.94)).toBe("69.9%");
    expect(formatPercent(null)).toBe("—");
  });

  it("sumPaise", () => {
    expect(sumPaise([1, 2, 3])).toBe(6);
    expect(sumPaise([])).toBe(0);
  });
});
