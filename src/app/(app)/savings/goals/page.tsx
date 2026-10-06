import type { Metadata } from "next";
import { SavingsGoals } from "@/features/savings/savings-goals";
import { loadAppContext } from "@/lib/services/bootstrap";
import { listGoalProgress } from "@/lib/services/savings";

export const metadata: Metadata = { title: "Savings goals" };

export default async function SavingsGoalsPage() {
  const context = await loadAppContext();
  const goals = await listGoalProgress(context.userId, context.today);
  return <SavingsGoals goals={goals} destinations={context.categories.filter((c) => c.type === "SAVINGS")} dateFormat={context.settings.dateFormat} />;
}
