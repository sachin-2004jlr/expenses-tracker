import type { ReactNode } from "react";
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
  authEnabled: boolean;
  children: ReactNode;
}

/** Icon rail + top bar around a rounded content panel, like a trading dashboard frame. */
export function AppShell({ categories, tagSuggestions, today, currentMonth, user, authEnabled, children }: AppShellProps) {
  return (
    <TransactionDialogProvider categories={categories} tagSuggestions={tagSuggestions} today={today}>
      <div className="flex min-h-svh w-full bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[72px]">
          <AppHeader user={user} authEnabled={authEnabled} currentMonth={currentMonth} />
          <main className="flex-1 px-2 pb-24 pt-3 sm:px-4 lg:px-5 lg:pb-6 lg:pt-4">
            <div className="mx-auto w-full max-w-[1440px] rounded-3xl border border-border bg-panel p-3 sm:p-5 lg:p-6">{children}</div>
          </main>
        </div>
        <MobileNav />
      </div>
    </TransactionDialogProvider>
  );
}
