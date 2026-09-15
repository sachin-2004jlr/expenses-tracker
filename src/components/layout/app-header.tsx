"use client";

import { usePathname } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";

export function AppHeader() {
  const pathname = usePathname();
  const { openCreate } = useTransactionDialog();
  const current = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-6 lg:h-16 lg:px-8">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wallet className="size-3.5" aria-hidden />
        </span>
      </div>
      <h1 className="text-base font-semibold tracking-tight sm:text-lg">{current?.label ?? "Expenses"}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => openCreate()} className="hidden sm:inline-flex" data-testid="add-transaction">
          <Plus data-icon="inline-start" aria-hidden />
          Add transaction
        </Button>
        <Button onClick={() => openCreate()} size="icon" className="sm:hidden" aria-label="Add transaction">
          <Plus aria-hidden />
        </Button>
      </div>
    </header>
  );
}
