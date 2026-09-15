"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/money";
import { TransactionListItem } from "@/features/transactions/transaction-list-item";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { calendarGrid, formatIsoDate, monthKeyOf, weekDays, weekdayLabels } from "@/lib/dates";
import { formatCompactCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { IsoDate, MonthKey, Transaction } from "@/types";

export interface MonthCalendarProps {
  month: MonthKey;
  today: IsoDate;
  transactions: Transaction[];
  firstDayOfWeek: 0 | 1;
  dateFormat: string;
  initialDay?: IsoDate | null;
}

interface DayTotals {
  income: number;
  expenses: number;
  count: number;
  items: Transaction[];
}

export function MonthCalendar({ month, today, transactions, firstDayOfWeek, dateFormat, initialDay }: MonthCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openCreate } = useTransactionDialog();
  const [view, setView] = useState<"month" | "week">("month");

  const defaultDay = initialDay && monthKeyOf(initialDay) === month ? initialDay : monthKeyOf(today) === month ? today : `${month}-01`;
  const [selected, setSelected] = useState<IsoDate>(defaultDay);

  const byDay = useMemo(() => {
    const map = new Map<IsoDate, DayTotals>();
    for (const tx of transactions) {
      const entry = map.get(tx.date) ?? { income: 0, expenses: 0, count: 0, items: [] };
      if (tx.type === "INCOME") entry.income += tx.amount;
      else entry.expenses += tx.amount;
      entry.count += 1;
      entry.items.push(tx);
      map.set(tx.date, entry);
    }
    return map;
  }, [transactions]);

  const grid = useMemo(() => calendarGrid(month, firstDayOfWeek), [month, firstDayOfWeek]);
  const labels = useMemo(() => weekdayLabels(firstDayOfWeek), [firstDayOfWeek]);
  const week = useMemo(() => weekDays(selected, firstDayOfWeek), [selected, firstDayOfWeek]);
  const selectedTotals = byDay.get(selected);

  const selectDay = (day: IsoDate) => {
    setSelected(day);
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", day);
    if (monthKeyOf(day) !== month) params.set("month", monthKeyOf(day));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderCell = (day: IsoDate, compact: boolean) => {
    const inMonth = monthKeyOf(day) === month;
    const totals = byDay.get(day);
    const isToday = day === today;
    const isSelected = day === selected;
    return (
      <button
        key={day}
        type="button"
        onClick={() => selectDay(day)}
        aria-label={`${formatIsoDate(day, "EEEE d MMMM yyyy")}${totals ? `, ${totals.count} transaction${totals.count === 1 ? "" : "s"}` : ""}`}
        aria-pressed={isSelected}
        className={cn(
          "flex flex-col rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          compact ? "min-h-14 sm:min-h-20" : "min-h-24",
          inMonth ? "bg-card hover:bg-muted" : "bg-muted/30 text-muted-foreground hover:bg-muted/60",
          isSelected ? "border-foreground/40 ring-1 ring-foreground/20" : "border-border",
        )}
      >
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {Number(day.slice(8, 10))}
        </span>
        {totals && (
          <span className="mt-auto flex flex-col gap-0.5 text-[10px] leading-tight tabular-nums sm:text-[11px]">
            {totals.income > 0 && <span className="truncate text-income-foreground">+{formatCompactCurrency(totals.income)}</span>}
            {totals.expenses > 0 && <span className="truncate text-expense-foreground">−{formatCompactCurrency(totals.expenses)}</span>}
          </span>
        )}
        {totals && compact && (
          <span className="sr-only">
            {totals.count} transactions
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>{view === "month" ? "Month" : "Week"} view</CardTitle>
          <CardDescription>Tap a day to see its transactions.</CardDescription>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <div role="radiogroup" aria-label="Calendar view" className="inline-flex items-center rounded-lg bg-muted p-0.5">
              {(["month", "week"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    "h-7 rounded-md px-3 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    view === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {labels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          {view === "month" ? (
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
              {grid.flat().map((day) => renderCell(day, true))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Week">
              {week.map((day) => renderCell(day, false))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formatIsoDate(selected, "EEEE, d MMMM")}</CardTitle>
          <CardDescription>
            {selectedTotals ? (
              <span className="flex flex-wrap gap-x-3">
                {selectedTotals.income > 0 && (
                  <span>
                    In <Amount paise={selectedTotals.income} className="font-medium text-income-foreground" />
                  </span>
                )}
                {selectedTotals.expenses > 0 && (
                  <span>
                    Out <Amount paise={selectedTotals.expenses} className="font-medium text-expense-foreground" />
                  </span>
                )}
              </span>
            ) : (
              "No transactions on this day."
            )}
          </CardDescription>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button size="sm" variant="outline" onClick={() => openCreate({ date: selected })}>
              <Plus data-icon="inline-start" aria-hidden />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTotals ? (
            <ul className="-mx-2 divide-y divide-border/70">
              {selectedTotals.items.map((tx) => (
                <li key={tx.id}>
                  <TransactionListItem transaction={tx} today={today} dateFormat={dateFormat} showDate={false} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nothing recorded"
              description="Add an income or expense for this date."
              compact
              action={
                <Button size="sm" onClick={() => openCreate({ date: selected })}>
                  <Plus data-icon="inline-start" aria-hidden />
                  Add transaction
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
