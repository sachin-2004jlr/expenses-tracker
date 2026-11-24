import type { ReactNode } from "react";

/** The savings module: a separate ledger. Its sections live in the local navigation bar. */
export default function SavingsLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
