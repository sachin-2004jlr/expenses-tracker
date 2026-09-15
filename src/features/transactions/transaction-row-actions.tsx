"use client";

import { useRouter } from "next/navigation";
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
import { deleteTransactionAction, duplicateTransactionAction } from "./actions";
import { useTransactionDialog } from "./transaction-dialog-provider";

export interface TransactionRowActionsProps {
  transaction: Transaction;
  /** Date to use for the duplicate (defaults to the original date). */
  duplicateDate?: string;
}

/** Edit / Duplicate / Delete menu. Deletion always asks for confirmation. */
export function TransactionRowActions({ transaction, duplicateDate }: TransactionRowActionsProps) {
  const router = useRouter();
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
    router.refresh();
  };

  const remove = async () => {
    const result = await deleteTransactionAction(transaction.id);
    if (!result.ok) {
      toast.error("Could not delete", { description: result.error });
      return;
    }
    toast.success("Transaction deleted", { description: transaction.description });
    router.refresh();
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
            <strong>{transaction.description}</strong> ({formatCurrency(transaction.amount)}) will be permanently removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
