"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowDownToLine, ArrowUpFromLine, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/shared/category-icon";
import { paiseToDecimalString, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { savingsEntryFormSchema, type SavingsEntryFormValues } from "@/lib/validation/savings";
import type { Category, IsoDate, SavingsEntry, SavingsEntryKind } from "@/types";
import { createSavingsEntryAction, updateSavingsEntryAction } from "./actions";

const NONE = "__none";

export interface SavingsEntryDefaults {
  kind?: SavingsEntryKind;
  date?: IsoDate;
}

export interface SavingsEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  entry: SavingsEntry | null;
  defaults: SavingsEntryDefaults;
  /** Savings categories (type SAVINGS). */
  categories: Category[];
  today: IsoDate;
  onSaved: (entry: SavingsEntry, mode: "create" | "edit") => void;
}

const KINDS = [
  { value: "DEPOSIT", label: "Add to savings", short: "Add", icon: ArrowDownToLine, active: "bg-background text-income-foreground shadow-sm" },
  { value: "SPEND", label: "Used from savings", short: "Use", icon: ArrowUpFromLine, active: "bg-background text-saved-foreground shadow-sm" },
] as const;

function initialValues(mode: "create" | "edit", entry: SavingsEntry | null, defaults: SavingsEntryDefaults, today: IsoDate): SavingsEntryFormValues {
  if (mode === "edit" && entry) {
    return {
      kind: entry.kind,
      amount: paiseToDecimalString(entry.amount).replace(/\.00$/, ""),
      description: entry.description,
      categoryId: entry.categoryId ?? "",
      date: entry.date,
      journal: entry.journal ?? "",
    };
  }
  return { kind: defaults.kind ?? "DEPOSIT", amount: "", description: "", categoryId: "", date: defaults.date ?? today, journal: "" };
}

/** Add or edit a savings entry. Lives only in the savings module; never touches the monthly tracker. */
export function SavingsEntryDialog({ open, onOpenChange, mode, entry, defaults, categories, today, onSaved }: SavingsEntryDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const form = useForm<SavingsEntryFormValues>({
    resolver: zodResolver(savingsEntryFormSchema),
    defaultValues: initialValues(mode, entry, defaults, today),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, register, handleSubmit, formState } = form;
  const kind = useWatch({ control, name: "kind" });
  const isSpend = kind === "SPEND";
  const items = useMemo(() => [{ value: NONE, label: "Nothing specific" }, ...categories.map((c) => ({ value: c.id, label: c.name }))], [categories]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const amount = parseMoney(values.amount);
    if (amount === null || amount <= 0) {
      form.setError("amount", { message: "Enter a valid amount greater than zero" });
      return;
    }
    const input = {
      kind: values.kind,
      amount,
      description: values.description.trim(),
      categoryId: values.categoryId && values.categoryId !== NONE ? values.categoryId : null,
      date: values.date,
      // Only send the journal when it changed, so an edit can never wipe a note by accident.
      journal: values.journal.trim() !== (entry?.journal ?? "").trim() ? values.journal : undefined,
    };
    try {
      const result = mode === "edit" && entry ? await updateSavingsEntryAction(entry.id, input) : await createSavingsEntryAction(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            if (field in values) form.setError(field as keyof SavingsEntryFormValues, { message });
          }
        }
        setServerError(result.error);
        return;
      }
      onSaved(result.data, mode);
      onOpenChange(false);
    } catch {
      setServerError("Could not reach the server. Check your connection and try again; nothing was saved.");
    }
  });

  const title = mode === "edit" ? "Edit savings entry" : isSpend ? "Used from savings" : "Add to savings";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={amountRef} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Savings are tracked on their own and never change your monthly income, expenses or balance.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate data-testid="savings-form">
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Savings entry type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {KINDS.map((option) => {
                  const Icon = option.icon;
                  const active = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={option.label}
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
                      <span className="sm:hidden">{option.short}</span>
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="sv-amount">Amount</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <InputGroup className="h-11">
                  <InputGroupAddon>
                    <InputGroupText className="text-base font-semibold text-foreground">₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="sv-amount"
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
                    className="h-full text-lg font-semibold tabular-nums"
                  />
                </InputGroup>
              )}
            />
            <FieldError message={formState.errors.amount?.message} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sv-description">Description</Label>
            <Input
              id="sv-description"
              placeholder={isSpend ? "Bought gold, FD at SBI, Goa trip…" : "October savings, bonus, gift from family…"}
              autoComplete="off"
              aria-invalid={Boolean(formState.errors.description)}
              {...register("description")}
            />
            <FieldError message={formState.errors.description?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sv-category">{isSpend ? "Used for" : "Earmark for"}</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <Select value={field.value || (isSpend ? null : NONE)} onValueChange={(value) => field.onChange(value ?? "")} items={items}>
                    <SelectTrigger id="sv-category" className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {!isSpend && <SelectItem value={NONE}>Nothing specific</SelectItem>}
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={formState.errors.categoryId?.message} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sv-date">Date</Label>
              <Input id="sv-date" type="date" aria-invalid={Boolean(formState.errors.date)} {...register("date")} />
              <FieldError message={formState.errors.date?.message} />
            </div>
          </div>

          <div className="grid gap-1.5 rounded-xl border border-saved/30 bg-saved/5 p-3">
            <Label htmlFor="sv-journal" className="text-saved-foreground">
              <NotebookPen className="size-4" aria-hidden />
              {isSpend ? "What did you do with it?" : "Note"} <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="sv-journal"
              rows={3}
              placeholder={isSpend ? "e.g. Bought 2g of gold at ₹7,200/g from Tanishq; bill in Drive." : "e.g. Moved from salary account; planning to start an SIP."}
              {...register("journal")}
            />
            <p className="text-xs text-muted-foreground">Saved to your savings journal.</p>
            <FieldError message={formState.errors.journal?.message} />
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
              className={isSpend ? "bg-saved text-white hover:bg-saved/90" : "bg-income text-white hover:bg-income/90"}
            >
              {formState.isSubmitting ? "Saving…" : mode === "edit" ? "Save changes" : isSpend ? "Record use" : "Add to savings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}
