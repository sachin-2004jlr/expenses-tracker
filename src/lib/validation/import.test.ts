import { describe, expect, it } from "vitest";
import { validateBackup } from "./import";

const valid = {
  format: "expenses-tracker-backup",
  version: 1,
  categories: [{ name: "Food", type: "EXPENSE", icon: "utensils", color: "orange" }],
  transactions: [
    { type: "INCOME", amount: "55000.00", description: "Salary", category: "Salary", date: "2026-09-01", tags: ["work"] },
    { type: "EXPENSE", amount: 850.5, description: "Dinner", category: "Food", date: "2026-09-15", notes: null },
  ],
};

describe("validateBackup", () => {
  it("accepts a valid backup and normalises amounts to paise", () => {
    const result = validateBackup(valid);
    expect(result.ok).toBe(true);
    expect(result.data?.transactions[0]?.amount).toBe(5_500_000);
    expect(result.data?.transactions[1]?.amount).toBe(85_050);
    expect(result.data?.transactions[0]?.tags).toEqual(["work"]);
    expect(result.data?.transactions[1]?.currency).toBe("INR");
  });

  it("rejects files that are not backups", () => {
    const result = validateBackup({ hello: "world" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "format")).toBe(true);
  });

  it("rejects malformed amounts", () => {
    const result = validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], amount: "abc" }] });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.path).toBe("transactions.0.amount");
  });

  it("rejects zero or negative amounts", () => {
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], amount: "0" }] }).ok).toBe(false);
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], amount: "-5" }] }).ok).toBe(false);
  });

  it("rejects invalid dates and types", () => {
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], date: "2026-02-30" }] }).ok).toBe(false);
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], type: "TRANSFER" }] }).ok).toBe(false);
  });

  it("rejects missing categories and descriptions", () => {
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], category: "" }] }).ok).toBe(false);
    expect(validateBackup({ ...valid, transactions: [{ ...valid.transactions[0], description: "   " }] }).ok).toBe(false);
  });

  it("sanitises unknown icons/colours to safe defaults", () => {
    const result = validateBackup({ ...valid, categories: [{ name: "X", type: "EXPENSE", icon: "<script>", color: "neon" }] });
    expect(result.ok).toBe(true);
    expect(result.data?.categories[0]).toMatchObject({ icon: "tag", color: "slate" });
  });
});
