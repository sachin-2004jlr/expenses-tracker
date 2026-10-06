"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/money";
import type { Category, IsoDate, SavingsEntry } from "@/types";
import { SavingsEntryDialog, type SavingsEntryDefaults } from "./savings-entry-dialog";

interface SavingsDialogContextValue {
  openCreate: (defaults?: SavingsEntryDefaults) => void;
  openEdit: (entry: SavingsEntry) => void;
}

const SavingsDialogContext = createContext<SavingsDialogContextValue | null>(null);

export function useSavingsDialog(): SavingsDialogContextValue {
  const context = useContext(SavingsDialogContext);
  if (!context) throw new Error("useSavingsDialog must be used inside SavingsDialogProvider");
  return context;
}

interface State {
  open: boolean;
  mode: "create" | "edit";
  entry: SavingsEntry | null;
  defaults: SavingsEntryDefaults;
}

/** Owns the single savings entry dialog for every savings page. */
export function SavingsDialogProvider({ categories, today, children }: { categories: Category[]; today: IsoDate; children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, mode: "create", entry: null, defaults: {} });
  // A new key per open remounts the form with fresh default values.
  const [nonce, setNonce] = useState(0);

  const openCreate = useCallback((defaults: SavingsEntryDefaults = {}) => {
    setNonce((n) => n + 1);
    setState({ open: true, mode: "create", entry: null, defaults });
  }, []);
  const openEdit = useCallback((entry: SavingsEntry) => {
    setNonce((n) => n + 1);
    setState({ open: true, mode: "edit", entry, defaults: {} });
  }, []);

  const onSaved = useCallback((entry: SavingsEntry, mode: "create" | "edit") => {
    const label = entry.kind === "DEPOSIT" ? "Added to savings" : "Use of savings recorded";
    toast.success(mode === "create" ? label : "Savings entry updated", { description: `${entry.description} · ${formatCurrency(entry.amount)}` });
  }, []);

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <SavingsDialogContext.Provider value={value}>
      {children}
      <SavingsEntryDialog
        key={nonce}
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        mode={state.mode}
        entry={state.entry}
        defaults={state.defaults}
        categories={categories}
        today={today}
        onSaved={onSaved}
      />
    </SavingsDialogContext.Provider>
  );
}
