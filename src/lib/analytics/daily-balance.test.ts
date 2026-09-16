import { describe, expect, it } from "vitest";
import type { TransactionLike } from "@/types";
import { dailyBalanceSeries } from "./calculations";

const tx = (type: "INCOME" | "EXPENSE", rupees: number, date: string): TransactionLike => ({ type, amount: rupees * 100, date });

describe("dailyBalanceSeries", () => {
  it("accumulates from the opening balance across every day of the month", () => {
    const series = dailyBalanceSeries([tx("INCOME", 55_000, "2026-09-01"), tx("EXPENSE", 850, "2026-09-15")], "2026-09", 1_000_000);
    expect(series).toHaveLength(30);
    expect(series[0]).toEqual({ date: "2026-09-01", balance: 1_000_000 + 5_500_000, income: 5_500_000, expenses: 0 });
    expect(series[13]!.balance).toBe(6_500_000);
    expect(series[14]).toEqual({ date: "2026-09-15", balance: 6_500_000 - 85_000, income: 0, expenses: 85_000 });
    expect(series[29]!.balance).toBe(6_415_000);
  });

  it("stops at untilDate for the current month", () => {
    const series = dailyBalanceSeries([], "2026-09", 0, "2026-09-16");
    expect(series).toHaveLength(16);
    expect(series[15]!.date).toBe("2026-09-16");
  });

  it("ignores transactions outside the month and handles leap February", () => {
    const series = dailyBalanceSeries([tx("INCOME", 100, "2024-01-31"), tx("INCOME", 5, "2024-02-29")], "2024-02", 0);
    expect(series).toHaveLength(29);
    expect(series[0]!.balance).toBe(0);
    expect(series[28]!.balance).toBe(500);
  });

  it("returns nothing when untilDate is before the month", () => {
    expect(dailyBalanceSeries([], "2026-09", 0, "2026-08-31")).toEqual([]);
  });

  it("can go negative when expenses exceed the opening balance", () => {
    const series = dailyBalanceSeries([tx("EXPENSE", 20, "2026-09-02")], "2026-09", 1_000, "2026-09-03");
    expect(series.map((p) => p.balance)).toEqual([1_000, -1_000, -1_000]);
  });
});
