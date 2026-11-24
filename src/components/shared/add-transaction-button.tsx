"use client";

import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import type { TransactionDefaults } from "@/features/transactions/transaction-dialog";

export interface AddTransactionButtonProps extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  defaults?: TransactionDefaults;
  label?: string;
}

export function AddTransactionButton({ defaults, label = "Add transaction", ...props }: AddTransactionButtonProps) {
  const { openCreate } = useTransactionDialog();
  return (
    <Button onClick={() => openCreate(defaults)} {...props}>
      <Plus data-icon="inline-start" aria-hidden />
      {label}
    </Button>
  );
}
