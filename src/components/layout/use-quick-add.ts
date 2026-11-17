"use client";

import { usePathname } from "next/navigation";
import { useSavingsDialog } from "@/features/savings/savings-dialog-provider";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { isSavingsPath } from "@/lib/nav";

export interface QuickAdd {
  /** Which ledger the "+" adds to on this page. */
  ledger: "tracker" | "savings";
  label: string;
  open: () => void;
}

/** The "+" adds a transaction in the money tracker and a savings entry inside Savings. */
export function useQuickAdd(): QuickAdd {
  const pathname = usePathname();
  const transactions = useTransactionDialog();
  const savings = useSavingsDialog();
  if (isSavingsPath(pathname)) {
    return { ledger: "savings", label: "Add to savings", open: () => savings.openCreate({ kind: "DEPOSIT" }) };
  }
  return { ledger: "tracker", label: "Add transaction", open: () => transactions.openCreate() };
}
