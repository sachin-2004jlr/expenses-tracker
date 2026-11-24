import type { ReactNode } from "react";
import { SavingsDialogProvider } from "@/features/savings/savings-dialog-provider";
import { TransactionDialogProvider } from "@/features/transactions/transaction-dialog-provider";
import type { CurrentUser } from "@/lib/auth";
import type { Category, IsoDate, MonthKey } from "@/types";
import { GlobalNav } from "./global-nav";
import { LocalNav } from "./local-nav";

export interface AppShellProps {
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
  currentMonth: MonthKey;
  user: CurrentUser | null;
  children: ReactNode;
}

/**
 * Apple-website frame: a thin global navigation bar, a local navigation bar for the page, then the
 * page on the light canvas. Both dialogs live here so "+" adds to the ledger of the current page.
 */
export function AppShell({ categories, tagSuggestions, today, currentMonth, user, children }: AppShellProps) {
  return (
    <TransactionDialogProvider categories={categories} tagSuggestions={tagSuggestions} today={today}>
      <SavingsDialogProvider categories={categories.filter((c) => c.type === "SAVINGS")} today={today}>
        <div className="flex min-h-svh w-full flex-col bg-background">
          <GlobalNav user={user} />
          <LocalNav currentMonth={currentMonth} />
          <main className="flex-1 overflow-x-clip px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </SavingsDialogProvider>
    </TransactionDialogProvider>
  );
}
