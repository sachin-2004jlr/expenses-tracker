import type { Metadata } from "next";
import { SavingsJournal } from "@/features/savings/savings-journal";
import { addDays } from "@/lib/dates";
import { loadAppContext } from "@/lib/services/bootstrap";
import { listSavingsEntries } from "@/lib/services/savings-entries";
import { listSavingsNotes } from "@/lib/services/savings-notes";
import { savingsEntryFiltersSchema } from "@/lib/validation/savings";

export const metadata: Metadata = { title: "Savings journal" };

export default async function SavingsJournalPage() {
  const context = await loadAppContext();
  const since = addDays(context.today, -90);
  const [notes, recent] = await Promise.all([listSavingsNotes(context.userId), listSavingsEntries(context.userId, savingsEntryFiltersSchema.parse({ pageSize: 100 }))]);
  const pending = recent.items.filter((e) => !e.journal && e.date >= since).slice(0, 12);
  return <SavingsJournal notes={notes} pendingEntries={pending} today={context.today} dateFormat={context.settings.dateFormat} />;
}
