"use client";

import { useState, type FormEvent } from "react";
import { Target, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { setBudgetAction } from "@/features/budgets/actions";
import { budgetStatus } from "@/lib/analytics/budgets";
import { formatCurrency, paiseToDecimalString, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Budget, Category } from "@/types";

export interface BudgetManagerProps {
  /** Expense categories only. */
  categories: Category[];
  budgets: Budget[];
  /** This month's spending per category id, in paise. */
  spent: Record<string, number>;
  monthLabel: string;
}

function toInput(paise: number | undefined): string {
  return paise ? paiseToDecimalString(paise).replace(/\.00$/, "") : "";
}

/** One row per expense category with an inline ₹ limit. Empty or 0 removes the budget. */
export function BudgetManager({ categories, budgets, spent, monthLabel }: BudgetManagerProps) {
  const saved = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

  const save = async (category: Category, value: string) => {
    const trimmed = value.trim();
    const paise = trimmed === "" ? 0 : parseMoney(trimmed);
    if (paise === null) {
      setErrors((e) => ({ ...e, [category.id]: "Enter an amount like 5000 or 5,000.50" }));
      return;
    }
    setErrors((e) => ({ ...e, [category.id]: "" }));
    setSavingId(category.id);
    const result = await setBudgetAction({ categoryId: category.id, amount: paise });
    setSavingId(null);
    if (!result.ok) {
      setErrors((e) => ({ ...e, [category.id]: result.error }));
      return;
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[category.id];
      return next;
    });
    toast.success(result.data ? `${category.name} budget saved` : `${category.name} budget removed`, {
      description: result.data ? `${formatCurrency(result.data.amount)} per month` : undefined,
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>, category: Category) => {
    event.preventDefault();
    void save(category, drafts[category.id] ?? toInput(saved.get(category.id)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budgets</CardTitle>
        <CardDescription>
          Set a limit per expense category. Limits apply to every month; progress below is for {monthLabel}.
          {totalBudget > 0 && (
            <>
              {" "}
              Total: <span className="font-medium text-foreground tabular-nums">{formatCurrency(totalBudget)}</span> a month.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState icon={Target} title="No expense categories" description="Add an expense category first, then give it a budget." compact />
        ) : (
          <ul className="divide-y divide-border/70" aria-label="Category budgets">
            {categories.map((category) => {
              const current = saved.get(category.id);
              const value = drafts[category.id] ?? toInput(current);
              const dirty = drafts[category.id] !== undefined && drafts[category.id] !== toInput(current);
              const used = spent[category.id] ?? 0;
              const status = current ? budgetStatus(used, current) : "ok";
              const error = errors[category.id];
              return (
                <li key={category.id} className="py-3">
                  <form onSubmit={(e) => onSubmit(e, category)} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`budget-${category.id}`} className="block truncate text-sm font-medium">
                        {category.name}
                      </label>
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          !current ? "text-muted-foreground" : status === "over" ? "text-expense-foreground" : status === "warning" ? "text-brand" : "text-muted-foreground",
                        )}
                      >
                        {formatCurrency(used)} spent{current ? ` of ${formatCurrency(current)}` : " this month"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <InputGroup className="w-36">
                        <InputGroupAddon>
                          <InputGroupText>₹</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id={`budget-${category.id}`}
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="No limit"
                          value={value}
                          onChange={(e) => setDrafts((d) => ({ ...d, [category.id]: e.target.value }))}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `budget-${category.id}-error` : undefined}
                          className="tabular-nums"
                          data-testid={`budget-input-${category.name}`}
                        />
                      </InputGroup>
                      {dirty ? (
                        <Button type="submit" size="sm" disabled={savingId === category.id}>
                          {savingId === category.id ? "Saving…" : "Save"}
                        </Button>
                      ) : current ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${category.name} budget`}
                          disabled={savingId === category.id}
                          onClick={() => void save(category, "")}
                        >
                          <X aria-hidden />
                        </Button>
                      ) : (
                        <span className="size-7" aria-hidden />
                      )}
                    </div>
                    {error && (
                      <p id={`budget-${category.id}-error`} role="alert" className="basis-full text-xs text-destructive">
                        {error}
                      </p>
                    )}
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
