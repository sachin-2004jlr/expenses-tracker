"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pencil, Play, Plus, Repeat, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/money";
import { formatIsoDate } from "@/lib/dates";
import { describeFrequency } from "@/lib/dates/recurrence";
import { paiseToDecimalString, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Category, IsoDate, RecurrenceFrequency, RecurringTransaction, TransactionType } from "@/types";
import { createRecurringAction, deleteRecurringAction, runRecurringNowAction, toggleRecurringAction, updateRecurringAction } from "@/features/recurring/actions";

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  categoryId: string;
  notes: string;
  frequency: RecurrenceFrequency;
  interval: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

function emptyForm(today: IsoDate): FormState {
  return { type: "EXPENSE", amount: "", description: "", categoryId: "", notes: "", frequency: "MONTHLY", interval: "1", startDate: today, endDate: "", isActive: true };
}

function fromRule(rule: RecurringTransaction): FormState {
  return {
    type: rule.type,
    amount: paiseToDecimalString(rule.amount).replace(/\.00$/, ""),
    description: rule.description,
    categoryId: rule.categoryId,
    notes: rule.notes ?? "",
    frequency: rule.frequency,
    interval: String(rule.interval),
    startDate: rule.startDate,
    endDate: rule.endDate ?? "",
    isActive: rule.isActive,
  };
}

export function RecurringManager({ rules, categories, today, dateFormat }: { rules: RecurringTransaction[]; categories: Category[]; today: IsoDate; dateFormat: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(today));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [running, setRunning] = useState(false);

  const visibleCategories = useMemo(() => categories.filter((c) => c.type === form.type), [categories, form.type]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(today));
    setError(null);
    setOpen(true);
  };
  const openEdit = (rule: RecurringTransaction) => {
    setEditing(rule);
    setForm(fromRule(rule));
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    const amount = parseMoney(form.amount);
    if (amount === null || amount <= 0) {
      setError("Enter a valid amount greater than zero");
      return;
    }
    if (!form.categoryId) {
      setError("Choose a category");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      type: form.type,
      amount,
      description: form.description.trim(),
      categoryId: form.categoryId,
      notes: form.notes.trim() || null,
      frequency: form.frequency,
      interval: Number.parseInt(form.interval, 10) || 1,
      startDate: form.startDate,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };
    const result = editing ? await updateRecurringAction(editing.id, input) : await createRecurringAction(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] ?? result.error : result.error);
      return;
    }
    toast.success(editing ? "Recurring rule updated" : "Recurring rule created", { description: result.data.description });
    setOpen(false);
    router.refresh();
  };

  const toggle = async (rule: RecurringTransaction, isActive: boolean) => {
    const result = await toggleRecurringAction(rule.id, isActive);
    if (!result.ok) toast.error("Could not update rule", { description: result.error });
    else router.refresh();
  };

  const remove = async () => {
    if (!deleting) return;
    const result = await deleteRecurringAction(deleting.id);
    if (!result.ok) {
      toast.error("Could not delete rule", { description: result.error });
      return;
    }
    toast.success("Recurring rule deleted", { description: "Already-created transactions were kept." });
    setDeleting(null);
    router.refresh();
  };

  const runNow = async () => {
    setRunning(true);
    const result = await runRecurringNowAction();
    setRunning(false);
    if (!result.ok) toast.error("Could not run recurring rules", { description: result.error });
    else {
      toast.success(result.data.created > 0 ? `${result.data.created} transaction${result.data.created === 1 ? "" : "s"} created` : "Nothing due today");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="max-sm:col-start-1 max-sm:row-start-1">Recurring transactions</CardTitle>
        <CardDescription className="max-sm:col-start-1 max-sm:row-start-2">Salary, rent, EMIs and subscriptions are created automatically on their due dates when you open the app.</CardDescription>
        <CardAction className="flex flex-wrap gap-2 max-sm:col-start-1 max-sm:row-start-3 max-sm:mt-1 max-sm:justify-self-start">
          <Button size="sm" variant="outline" onClick={runNow} disabled={running || rules.length === 0}>
            <Play data-icon="inline-start" aria-hidden />
            Run due now
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden />
            Add rule
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring rules yet"
            description="Add your salary or rent once and it will be recorded every month."
            compact
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" aria-hidden />
                Add rule
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {rules.map((rule) => (
              <li key={rule.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5", !rule.isActive && "opacity-60")}>
                <CategoryIcon icon={rule.category.icon} color={rule.category.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{rule.description}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {rule.category.name} · {describeFrequency(rule.frequency, rule.interval)} · next {formatIsoDate(rule.nextRunDate, dateFormat)}
                    {rule.endDate ? ` · until ${formatIsoDate(rule.endDate, dateFormat)}` : ""}
                  </span>
                </span>
                <Amount paise={rule.amount} type={rule.type} className="shrink-0 whitespace-nowrap text-sm font-semibold" />
                <span className="flex basis-full items-center justify-end gap-1 sm:basis-auto">
                  <Switch checked={rule.isActive} onCheckedChange={(checked) => void toggle(rule, checked)} aria-label={`${rule.isActive ? "Pause" : "Resume"} ${rule.description}`} size="sm" />
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(rule)} aria-label={`Edit ${rule.description}`}>
                    <Pencil aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(rule)} aria-label={`Delete ${rule.description}`}>
                    <Trash aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit recurring rule" : "New recurring rule"}</DialogTitle>
            <DialogDescription>Transactions are generated from the start date on every due date up to today.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["INCOME", "EXPENSE"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={form.type === type}
                  onClick={() => setForm((f) => ({ ...f, type, categoryId: "" }))}
                  className={cn(
                    "h-8 rounded-md text-sm font-medium transition-colors",
                    form.type === type ? (type === "INCOME" ? "bg-background text-income-foreground shadow-sm" : "bg-background text-expense-foreground shadow-sm") : "text-muted-foreground",
                  )}
                >
                  {type === "INCOME" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="rec-amount">Amount</Label>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput id="rec-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </InputGroup>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-description">Description</Label>
                <Input id="rec-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Salary, Rent, Netflix…" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-category">Category</Label>
                <Select value={form.categoryId || null} onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value ?? "" }))} items={visibleCategories.map((c) => ({ value: c.id, label: c.name }))}>
                  <SelectTrigger id="rec-category" className="w-full">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="rec-frequency">Repeats</Label>
                  <Select value={form.frequency} onValueChange={(value) => setForm((f) => ({ ...f, frequency: (value as RecurrenceFrequency) ?? f.frequency }))} items={FREQUENCIES}>
                    <SelectTrigger id="rec-frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rec-interval">Every</Label>
                  <Input id="rec-interval" type="number" min={1} max={365} value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-start">Start date</Label>
                <Input id="rec-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-end">
                  End date <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="rec-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-notes">Notes</Label>
              <Textarea id="rec-notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              Active
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save" : "Create rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={deleting ? `Delete "${deleting.description}"?` : "Delete rule"}
        description="Future occurrences stop. Transactions already created from this rule are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
