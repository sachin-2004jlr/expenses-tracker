import type { ReactNode } from "react";
import { SavingsDialogProvider } from "@/features/savings/savings-dialog-provider";
import { SavingsTabs } from "@/features/savings/savings-shell";
import { loadAppContext } from "@/lib/services/bootstrap";

/** The savings module: its own tabs and its own entry dialog, separate from the monthly tracker. */
export default async function SavingsLayout({ children }: { children: ReactNode }) {
  const context = await loadAppContext();
  return (
    <SavingsDialogProvider categories={context.categories.filter((c) => c.type === "SAVINGS")} today={context.today}>
      <div className="space-y-5">
        <SavingsTabs />
        {children}
      </div>
    </SavingsDialogProvider>
  );
}
