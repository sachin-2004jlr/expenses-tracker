import { calculateMonthTotals } from "@/lib/analytics/calculations";
import { getDb } from "@/lib/db";
import { formatMonthLabel, monthRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { MonthKey, SavingsEntry } from "@/types";
import { createSavingsEntry } from "./savings-entries";
import { getSettings } from "./settings";
import { listTransactionsInRange } from "./transactions";

/**
 * Month leftovers. The monthly tracker starts every month from ₹0, so what was left at the end
 * of a month (income − expenses) is offered once: move it into the savings module, or mark it as
 * already handled. The answer is remembered per month on the user's settings document.
 */

export async function isLeftoverHandled(userId: string, month: MonthKey): Promise<boolean> {
  const db = await getDb();
  const doc = await db.settings.findOne({ userId, leftoverHandledMonths: month }, { projection: { _id: 1 } });
  return doc !== null;
}

export async function markLeftoverHandled(userId: string, month: MonthKey): Promise<void> {
  await getSettings(userId); // make sure the settings document exists
  const db = await getDb();
  await db.settings.updateOne({ userId }, { $addToSet: { leftoverHandledMonths: month }, $set: { updatedAt: new Date() } });
}

/** The month's leftover, computed on the server (never trusted from the client). */
export async function monthLeftover(userId: string, month: MonthKey): Promise<number> {
  const { start, end } = monthRange(month);
  const totals = calculateMonthTotals(await listTransactionsInRange(userId, start, end), month);
  return totals.income - totals.expenses;
}

/** Add the month's leftover to savings as one "Add to savings" entry dated the month's last day. */
export async function moveLeftoverToSavings(userId: string, month: MonthKey): Promise<SavingsEntry> {
  if (await isLeftoverHandled(userId, month)) throw AppError.conflict(`${formatMonthLabel(month)} was already handled`);
  const amount = await monthLeftover(userId, month);
  if (amount <= 0) throw AppError.badRequest(`Nothing was left over in ${formatMonthLabel(month)}`);
  const entry = await createSavingsEntry(userId, {
    kind: "DEPOSIT",
    amount,
    description: `Left over from ${formatMonthLabel(month)}`,
    categoryId: null,
    date: monthRange(month).end,
  });
  await markLeftoverHandled(userId, month);
  return entry;
}
