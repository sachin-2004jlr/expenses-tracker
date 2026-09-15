import type { Metadata } from "next";
import { MonthSelector } from "@/components/shared/month-selector";
import { PageHeader } from "@/components/shared/page-header";
import { MonthCalendar } from "@/features/calendar/month-calendar";
import { formatMonthLabel, isValidIsoDate, monthRange } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import { listTransactionsInRange } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const dayParam = Array.isArray(params.day) ? params.day[0] : params.day;
  const { start, end } = monthRange(month);
  const transactions = await listTransactionsInRange(context.userId, start, end);
  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={formatMonthLabel(month)}
        eyebrow="Calendar"
        description={
          transactions.length === 0
            ? "No transactions this month yet."
            : `${transactions.length} transactions · ${formatCurrency(income)} in · ${formatCurrency(expenses)} out`
        }
        actions={<MonthSelector month={month} currentMonth={context.currentMonth} />}
      />
      <MonthCalendar
        key={month}
        month={month}
        today={context.today}
        transactions={transactions}
        firstDayOfWeek={context.settings.firstDayOfWeek}
        dateFormat={context.settings.dateFormat}
        initialDay={dayParam && isValidIsoDate(dayParam) ? dayParam : null}
      />
    </div>
  );
}
