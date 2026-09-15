"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/shared/category-icon";
import { paiseToDecimalString, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/validation/transaction";
import type { Category, IsoDate, Transaction, TransactionType } from "@/types";
import { createTransactionAction, updateTransactionAction } from "./actions";
import { TagInput } from "./tag-input";

export interface TransactionDefaults {
  type?: TransactionType;
  date?: IsoDate;
  categoryId?: string;
}

export interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  transaction: Transaction | null;
  defaults: TransactionDefaults;
  categories: Category[];
  tagSuggestions: string[];
  today: IsoDate;
  onSaved: (transaction: Transaction, mode: "create" | "edit", type: TransactionType) => void;
}

function initialValues(mode: "create" | "edit", transaction: Transaction | null, defaults: TransactionDefaults, today: IsoDate): TransactionFormValues {
  if (mode === "edit" && transaction) {
    return {
      type: transaction.type,
      amount: paiseToDecimalString(transaction.amount).replace(/\.00$/, ""),
      description: transaction.description,
      categoryId: transaction.categoryId,
      date: transaction.date,
      notes: transaction.notes ?? "",
      tags: transaction.tags.map((t) => t.name),
    };
  }
  return {
    type: defaults.type ?? "EXPENSE",
    amount: "",
    description: "",
    categoryId: defaults.categoryId ?? "",
    date: defaults.date ?? today,
    notes: "",
    tags: [],
  };
}

export function TransactionDialog(props: TransactionDialogProps) {
  const { open, onOpenChange, mode, transaction, defaults, categories, tagSuggestions, today, onSaved } = props;
  const [serverError, setServerError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: initialValues(mode, transaction, defaults, today),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { control, register, handleSubmit, setValue, formState } = form;
  const type = useWatch({ control, name: "type" });
  const categoryId = useWatch({ control, name: "categoryId" });

  // The provider remounts this component (new `key`) every time it is opened, so the
  // default values above always reflect the current intent; no reset effect is needed.

  const visibleCategories = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  // Keep the category consistent with the chosen type.
  useEffect(() => {
    if (categoryId && !visibleCategories.some((c) => c.id === categoryId)) {
      setValue("categoryId", "", { shouldValidate: formState.isSubmitted });
    }
  }, [categoryId, visibleCategories, setValue, formState.isSubmitted]);

  const categoryItems = useMemo(
    () => visibleCategories.map((c) => ({ value: c.id, label: c.name })),
    [visibleCategories],
  );

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const amount = parseMoney(values.amount);
    if (amount === null || amount <= 0) {
      form.setError("amount", { message: "Enter a valid amount greater than zero" });
      return;
    }
    const input = {
      type: values.type,
      amount,
      description: values.description.trim(),
      categoryId: values.categoryId,
      date: values.date,
      notes: values.notes.trim() ? values.notes.trim() : null,
      tags: values.tags,
    };
    const result =
      mode === "edit" && transaction
        ? await updateTransactionAction(transaction.id, input)
        : await createTransactionAction(input);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          if (field in values) form.setError(field as keyof TransactionFormValues, { message });
        }
      }
      setServerError(result.error);
      return;
    }
    onSaved(result.data, mode, values.type);
    onOpenChange(false);
  });

  const isIncome = type === "INCOME";
  const title = mode === "edit" ? "Edit transaction" : isIncome ? "Add income" : "Add expense";

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent
        className="sm:max-w-md"
        initialFocus={amountRef}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? null : isIncome ? <Plus className="size-4 text-income-foreground" /> : <Minus className="size-4 text-expense-foreground" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the details and save." : "Amount, description and category are required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate data-testid="transaction-form">
          {/* Type toggle */}
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(
                  [
                    { value: "INCOME", label: "Income", icon: Plus, active: "bg-background text-income-foreground shadow-sm" },
                    { value: "EXPENSE", label: "Expense", icon: Minus, active: "bg-background text-expense-foreground shadow-sm" },
                  ] as const
                ).map((option) => {
                  const Icon = option.icon;
                  const active = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        field.onChange(option.value);
                        amountRef.current?.focus();
                      }}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        active ? option.active : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          />

          {/* Amount */}
          <div className="grid gap-1.5">
            <Label htmlFor="tx-amount">Amount</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <InputGroup className="h-11">
                  <InputGroupAddon>
                    <InputGroupText className="text-base font-semibold text-foreground">₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="tx-amount"
                    ref={(element) => {
                      field.ref(element);
                      amountRef.current = element;
                    }}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? "tx-amount-error" : undefined}
                    className="h-full text-lg font-semibold tabular-nums"
                  />
                </InputGroup>
              )}
            />
            <FieldError id="tx-amount-error" message={formState.errors.amount?.message} />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              placeholder={isIncome ? "Salary, freelance invoice…" : "Dinner, Uber, groceries…"}
              autoComplete="off"
              aria-invalid={Boolean(formState.errors.description)}
              aria-describedby={formState.errors.description ? "tx-description-error" : undefined}
              {...register("description")}
            />
            <FieldError id="tx-description-error" message={formState.errors.description?.message} />
          </div>

          {/* Category + Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tx-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                    items={categoryItems}
                  >
                    <SelectTrigger id="tx-category" className="w-full" aria-invalid={fieldState.invalid} aria-describedby={fieldState.error ? "tx-category-error" : undefined}>
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                          {category.name}
                        </SelectItem>
                      ))}
                      {visibleCategories.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No {isIncome ? "income" : "expense"} categories yet</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="tx-category-error" message={formState.errors.categoryId?.message} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                aria-invalid={Boolean(formState.errors.date)}
                aria-describedby={formState.errors.date ? "tx-date-error" : undefined}
                {...register("date")}
              />
              <FieldError id="tx-date-error" message={formState.errors.date?.message} />
            </div>
          </div>

          {/* Tags */}
          <div className="grid gap-1.5">
            <Label htmlFor="tx-tags">Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field, fieldState }) => (
                <TagInput id="tx-tags" value={field.value} onChange={field.onChange} suggestions={tagSuggestions} aria-invalid={fieldState.invalid} />
              )}
            />
            <FieldError id="tx-tags-error" message={formState.errors.tags?.message} />
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="tx-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="tx-notes" rows={2} placeholder="Anything worth remembering" {...register("notes")} />
            <FieldError id="tx-notes-error" message={formState.errors.notes?.message} />
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formState.isSubmitting}
              className={cn(isIncome ? "bg-income text-white hover:bg-income/90" : "bg-expense text-white hover:bg-expense/90")}
            >
              {formState.isSubmitting ? "Saving…" : mode === "edit" ? "Save changes" : isIncome ? "Add income" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}
