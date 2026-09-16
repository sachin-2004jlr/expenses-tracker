"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import {
  createTransaction,
  deleteTransaction,
  duplicateTransaction,
  updateTransaction,
} from "@/lib/services/transactions";
import { getCurrentUserId } from "@/lib/services/user";
import { transactionInputSchema, type TransactionInput } from "@/lib/validation/transaction";
import type { Transaction } from "@/types";

function refreshAll(): void {
  // Every page derives from transactions (dashboard, calendar, analytics).
  revalidatePath("/", "layout");
}

export async function createTransactionAction(input: TransactionInput): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const created = await createTransaction(userId, transactionInputSchema.parse(input));
    refreshAll();
    return created;
  });
}

export async function updateTransactionAction(id: string, input: TransactionInput): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const updated = await updateTransaction(userId, id, transactionInputSchema.parse(input));
    refreshAll();
    return updated;
  });
}

export async function deleteTransactionAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const result = await deleteTransaction(userId, id);
    refreshAll();
    return { id: result.id };
  });
}

export async function duplicateTransactionAction(id: string, date?: string): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const copy = await duplicateTransaction(userId, id, date ? { date } : {});
    refreshAll();
    return copy;
  });
}
