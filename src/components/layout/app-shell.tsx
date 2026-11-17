import type { ReactNode } from "react";
import { SavingsDialogProvider } from "@/features/savings/savings-dialog-provider";
import { TransactionDialogProvider } from "@/features/transactions/transaction-dialog-provider";
import type { CurrentUser } from "@/lib/auth";
import type { Category, IsoDate, MonthKey } from "@/types";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export interface AppShellProps {
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
  currentMonth: MonthKey;
  user: CurrentUser | null;
  children: ReactNode;
}

/**
 * Sidebar (desktop) or bottom tab bar (mobile) around the page. Both dialogs live here so the
 * "+" button can add to whichever ledger the current page belongs to: the money tracker or Savings.
 */
export function AppShell({ categories, tagSuggestions, today, currentMonth, user, children }: AppShellProps) {
  return (
    <TransactionDialogProvider categories={categories} tagSuggestions={tagSuggestions} today={today}>
      <SavingsDialogProvider categories={categories.filter((c) => c.type === "SAVINGS")} today={today}>
        <div className="flex min-h-svh w-full bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip lg:pl-64">
            <AppHeader user={user} currentMonth={currentMonth} />
            <main className="flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>
          <MobileNav />
        </div>
      </SavingsDialogProvider>
    </TransactionDialogProvider>
  );
}
