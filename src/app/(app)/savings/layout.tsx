import type { ReactNode } from "react";
import { SavingsTabs } from "@/features/savings/savings-shell";

/**
 * The savings module: a separate ledger with its own pages. Its entry dialog lives in the app
 * shell (so the "+" button can open it); the section tabs are for phones, the sidebar covers desktop.
 */
export default function SavingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <SavingsTabs />
      {children}
    </div>
  );
}
