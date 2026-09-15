import type { ReactNode } from "react";
import { TransactionDialogProvider } from "@/features/transactions/transaction-dialog-provider";
import type { Category, IsoDate } from "@/types";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export interface AppShellProps {
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
  children: ReactNode;
}

export function AppShell({ categories, tagSuggestions, today, children }: AppShellProps) {
  return (
    <TransactionDialogProvider categories={categories} tagSuggestions={tagSuggestions} today={today}>
      <div className="flex min-h-svh w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </TransactionDialogProvider>
  );
}
