import { currentHour, formatMonthLabel, greetingForHour } from "@/lib/dates";
import type { MonthKey } from "@/types";

export function Greeting({ timeZone, month, currentMonth }: { timeZone: string; month: MonthKey; currentMonth: MonthKey }) {
  const greeting = greetingForHour(currentHour(timeZone));
  const isCurrent = month === currentMonth;
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{isCurrent ? "This month" : "Viewing"}</p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting} <span aria-hidden>👋</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isCurrent ? `Here is your overview for ${formatMonthLabel(month)}.` : `Showing ${formatMonthLabel(month)}. Use the selector to change month.`}
      </p>
    </div>
  );
}
