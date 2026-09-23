"use client";

import { useState } from "react";
import { Copy, Ellipsis, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency } from "@/lib/money";
import type { Transaction } from "@/types";
import { createTransactionAction, deleteTransactionAction, duplicateTransactionAction } from "./actions";
import { useTransactionDialog } from "./transaction-dialog-provider";

export interface TransactionRowActionsProps {
  transaction: Transaction;
  /** Date to use for the duplicate (defaults to the original date). */
  duplicateDate?: string;
}

/** Edit / Duplicate / Delete menu. Deletion always asks for confirmation. */
export function TransactionRowActions({ transaction, duplicateDate }: TransactionRowActionsProps) {
  const { openEdit } = useTransactionDialog();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const duplicate = async () => {
    setBusy(true);
    const result = await duplicateTransactionAction(transaction.id, duplicateDate);
    setBusy(false);
    if (!result.ok) {
      toast.error("Could not duplicate", { description: result.error });
      return;
    }
    toast.success("Transaction duplicated", { description: `${result.data.description} · ${formatCurrency(result.data.amount)}` });
  };

  const remove = async () => {
    const snapshot = transaction;
    const result = await deleteTransactionAction(snapshot.id);
    if (!result.ok) {
      toast.error("Could not delete", { description: result.error });
      return;
    }
    toast.success("Transaction deleted", {
      description: snapshot.description,
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          void createTransactionAction({
            type: snapshot.type,
            amount: snapshot.amount,
            description: snapshot.description,
            categoryId: snapshot.categoryId,
            date: snapshot.date,
            notes: snapshot.notes,
            tags: snapshot.tags.map((t) => t.name),
          }).then((restored) => {
            if (restored.ok) toast.success("Transaction restored", { description: snapshot.description });
            else toast.error("Could not restore", { description: restored.error });
          });
        },
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${transaction.description}`} disabled={busy} />}
        >
          <Ellipsis aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(transaction)}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void duplicate()}>
            <Copy aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this transaction?"
        description={
          <>
            <strong>{transaction.description}</strong> ({formatCurrency(transaction.amount)}) will be removed. You can undo this from the notification for a few seconds.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
