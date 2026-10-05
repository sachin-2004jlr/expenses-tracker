"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/money";
import type { Category, IsoDate, Transaction, TransactionType } from "@/types";
import { TransactionDialog, type TransactionDefaults } from "./transaction-dialog";

interface TransactionDialogContextValue {
  openCreate: (defaults?: TransactionDefaults) => void;
  openEdit: (transaction: Transaction) => void;
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
}

const TransactionDialogContext = createContext<TransactionDialogContextValue | null>(null);

export function useTransactionDialog(): TransactionDialogContextValue {
  const context = useContext(TransactionDialogContext);
  if (!context) throw new Error("useTransactionDialog must be used inside TransactionDialogProvider");
  return context;
}

interface DialogState {
  open: boolean;
  mode: "create" | "edit";
  transaction: Transaction | null;
  defaults: TransactionDefaults;
}

export interface TransactionDialogProviderProps {
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
  children: ReactNode;
}

/**
 * Mounts one global Add/Edit dialog so any button (header, FAB, table row, calendar day) can
 * open it. On save the server action revalidates the app, so totals, charts and lists update.
 */
export function TransactionDialogProvider({ categories, tagSuggestions, today, children }: TransactionDialogProviderProps) {
  const [state, setState] = useState<DialogState>({ open: false, mode: "create", transaction: null, defaults: {} });
  // Incremented on every open so the dialog remounts with fresh default values.
  const [nonce, setNonce] = useState(0);

  const openCreate = useCallback((defaults: TransactionDefaults = {}) => {
    setNonce((n) => n + 1);
    setState({ open: true, mode: "create", transaction: null, defaults });
  }, []);

  const openEdit = useCallback((transaction: Transaction) => {
    setNonce((n) => n + 1);
    setState({ open: true, mode: "edit", transaction, defaults: {} });
  }, []);

  const close = useCallback(() => setState((prev) => ({ ...prev, open: false })), []);

  const handleSaved = useCallback(
    (transaction: Transaction, mode: "create" | "edit", type: TransactionType) => {
      const label = type === "INCOME" ? "Income" : type === "EXPENSE" ? "Expense" : "Savings";
      toast.success(mode === "create" ? `${label} added` : `${label} updated`, {
        description: `${transaction.description} · ${formatCurrency(transaction.amount)}`,
      });
      // The server action already revalidated the app; no second router.refresh() round trip.
    },
    [],
  );

  const value = useMemo<TransactionDialogContextValue>(
    () => ({ openCreate, openEdit, categories, tagSuggestions, today }),
    [openCreate, openEdit, categories, tagSuggestions, today],
  );

  return (
    <TransactionDialogContext.Provider value={value}>
      {children}
      <TransactionDialog
        key={nonce}
        open={state.open}
        onOpenChange={(open) => (open ? null : close())}
        mode={state.mode}
        transaction={state.transaction}
        defaults={state.defaults}
        categories={categories}
        tagSuggestions={tagSuggestions}
        today={today}
        onSaved={handleSaved}
      />
    </TransactionDialogContext.Provider>
  );
}
