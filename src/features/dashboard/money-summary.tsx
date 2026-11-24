"use client";

import { ActionButton, Eyebrow } from "@/components/shared/apple-ui";
import { Shelf, ShelfItem } from "@/components/shared/shelf";
import { ChangePill } from "@/components/shared/stat-card";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { formatCurrency, formatCurrencyParts } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface MoneySummaryProps {
  /** Money left: carried in + this month's income − this month's expenses (paise). */
  balance: number;
  /** Left over from earlier months. */
  carriedIn: number;
  previousMonthLabel: string;
  monthLabel: string;
  income: number;
  expenses: number;
  incomeChange: number | null;
  expensesChange: number | null;
  /** Average spend per day so far. */
  perDay: number;
  /** Days left in the month including today; null for past/future months. */
  daysLeft: number | null;
}

const tile = "flex h-full min-h-[23rem] flex-col rounded-2xl p-7 shadow-card tile-hover";

function BigAmount({ paise, testId, negative }: { paise: number; testId?: string; negative?: boolean }) {
  const parts = formatCurrencyParts(paise);
  return (
    <p className="mt-6 flex items-baseline gap-1 font-semibold tracking-tight tabular-nums" data-testid={testId}>
      <span className={cn("text-4xl [overflow-wrap:anywhere]", negative && "text-destructive")}>
        {parts.sign}
        {parts.symbol}
        {parts.integer}
      </span>
      <span className="text-2xl text-muted-foreground">.{parts.fraction}</span>
    </p>
  );
}

/**
 * "Your month" shelf: money left (with the sum spelled out), income, spending and what was carried
 * in, as Apple-store tiles. Income and expenses only; savings are a separate ledger.
 */
export function MoneySummary({
  balance,
  carriedIn,
  previousMonthLabel,
  monthLabel,
  income,
  expenses,
  incomeChange,
  expensesChange,
  perDay,
  daysLeft,
}: MoneySummaryProps) {
  const { openCreate } = useTransactionDialog();
  const available = carriedIn + income;
  const spentShare = available > 0 ? Math.min(100, (expenses / available) * 100) : expenses > 0 ? 100 : 0;
  const perDayLeft = daysLeft && balance > 0 ? Math.floor(balance / daysLeft / 100) * 100 : null;
  const perDayRounded = Math.round(perDay / 100) * 100;

  return (
    <Shelf label="Your month">
      <ShelfItem className="w-[min(88vw,26rem)]">
        <section aria-label="Money left" className={cn(tile, "bg-card")}>
          <Eyebrow>{monthLabel} so far</Eyebrow>
          <h4 className="mt-1 font-heading text-2xl font-semibold">Money left.</h4>
          <BigAmount paise={balance} testId="total-balance" negative={balance < 0} />
          <p className="mt-3 text-sm text-muted-foreground tabular-nums" data-testid="balance-breakdown">
            <span className="text-foreground">{formatCurrency(carriedIn)}</span> carried from {previousMonthLabel} +{" "}
            <span className="text-income-foreground">{formatCurrency(income)}</span> income − <span className="text-foreground">{formatCurrency(expenses)}</span> spent
          </p>
          <div className="mt-auto pt-6">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Share of available money spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(spentShare)}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", spentShare >= 90 ? "bg-destructive" : spentShare >= 70 ? "bg-highlight" : "bg-income")}
                style={{ width: `${spentShare}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {available > 0 ? `Spent ${Math.round(spentShare)}% of the money you had.` : "No money in yet this month."}
              {perDayLeft !== null && ` About ${formatCurrency(perDayLeft)} a day for the next ${daysLeft} days.`}
            </p>
          </div>
        </section>
      </ShelfItem>

      <ShelfItem>
        <section aria-label="Income" className={cn(tile, "dark bg-ink text-foreground")}>
          <Eyebrow>Money in</Eyebrow>
          <h4 className="mt-1 font-heading text-2xl font-semibold">Income.</h4>
          <BigAmount paise={income} testId="income-amount" />
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ChangePill changePercent={incomeChange} increaseIsGood />
            {incomeChange === null ? "Nothing to compare with last month." : "compared with last month."}
          </p>
          <div className="mt-auto pt-6">
            <ActionButton onClick={() => openCreate({ type: "INCOME" })}>Add income</ActionButton>
          </div>
        </section>
      </ShelfItem>

      <ShelfItem>
        <section aria-label="Spent" className={cn(tile, "bg-card")}>
          <Eyebrow>Money out</Eyebrow>
          <h4 className="mt-1 font-heading text-2xl font-semibold">Spent.</h4>
          <BigAmount paise={expenses} testId="expense-amount" />
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ChangePill changePercent={expensesChange} increaseIsGood={false} />
            {expensesChange === null ? "Nothing to compare with last month." : "compared with last month."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            About <span className="text-foreground tabular-nums">{formatCurrency(perDayRounded)}</span> a day on average.
          </p>
          <div className="mt-auto pt-6">
            <ActionButton onClick={() => openCreate({ type: "EXPENSE" })}>Add expense</ActionButton>
          </div>
        </section>
      </ShelfItem>

      <ShelfItem>
        <section aria-label="Carried over" className={cn(tile, "bg-card")}>
          <Eyebrow>Carried over</Eyebrow>
          <h4 className="mt-1 font-heading text-2xl font-semibold">From {previousMonthLabel}.</h4>
          <BigAmount paise={carriedIn} negative={carriedIn < 0} />
          <p className="mt-3 text-sm text-muted-foreground">
            What was left at the end of {previousMonthLabel}. It is already part of your money left. Savings never are.
          </p>
        </section>
      </ShelfItem>
    </Shelf>
  );
}
