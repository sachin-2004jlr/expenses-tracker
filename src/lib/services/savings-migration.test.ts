// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration test against a throwaway in-memory MongoDB: savings that were briefly stored as
 * SAVINGS transactions in the monthly tracker move into the separate savings module, keep their
 * ids (so journal notes stay linked) and disappear from the tracker.
 */
describe("migrateLegacySavings", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = "memory://";
  });

  afterAll(async () => {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db.client.close();
  });

  it("moves legacy savings transactions into savings entries and relinks their notes", async () => {
    const { getDb } = await import("@/lib/db");
    const { migrateLegacySavings, listAllSavingsEntries } = await import("./savings-entries");
    const db = await getDb();
    const userId = "11111111-1111-4111-8111-111111111111";
    const now = new Date();
    const legacyId = "22222222-2222-4222-8222-222222222222";
    await db.transactions.insertMany([
      { _id: legacyId, userId, type: "SAVINGS" as never, amount: 1_000_000, currency: "INR", description: "Monthly SIP", categoryId: "c-sip", date: "2026-10-01", notes: null, tags: [], recurringId: null, createdAt: now, updatedAt: now },
      { _id: "33333333-3333-4333-8333-333333333333", userId, type: "EXPENSE", amount: 50_000, currency: "INR", description: "Lunch", categoryId: "c-food", date: "2026-10-01", notes: null, tags: [], recurringId: null, createdAt: now, updatedAt: now },
    ]);
    await db.savingsNotes.insertOne({ _id: "44444444-4444-4444-8444-444444444444", userId, title: "SIP", body: "Index fund", date: "2026-10-01", pinned: false, transactionId: legacyId } as never);

    await migrateLegacySavings(userId);

    const entries = await listAllSavingsEntries(userId);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: legacyId, kind: "DEPOSIT", amount: 1_000_000, description: "Monthly SIP", journal: "Index fund" });
    const remaining = await db.transactions.find({ userId }).toArray();
    expect(remaining.map((t) => t.description)).toEqual(["Lunch"]);
    const note = await db.savingsNotes.findOne({ userId });
    expect(note?.entryId).toBe(legacyId);
    expect(note && "transactionId" in note).toBe(false);
  }, 120_000);
});
