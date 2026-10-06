"use client";

import { useState, type FormEvent } from "react";
import { Archive, Ellipsis, Pencil, Plus, Target, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon, categoryColorValue } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CATEGORY_COLORS } from "@/lib/db/defaults";
import { formatIsoDate } from "@/lib/dates";
import { formatCurrency, formatPercent, paiseToDecimalString, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Category, SavingsGoalProgress } from "@/types";
import { createSavingsGoalAction, deleteSavingsGoalAction, updateSavingsGoalAction } from "./actions";

const NONE = "__none";

interface FormState {
  open: boolean;
  goal: SavingsGoalProgress | null;
  name: string;
  target: string;
  targetDate: string;
  categoryId: string;
  color: (typeof CATEGORY_COLORS)[number];
}

const CLOSED: FormState = { open: false, goal: null, name: "", target: "", targetDate: "", categoryId: NONE, color: "emerald" };

export interface SavingsGoalsProps {
  goals: SavingsGoalProgress[];
  /** Savings destinations (categories of type SAVINGS). */
  destinations: Category[];
  dateFormat: string;
}

export function SavingsGoals({ goals, destinations, dateFormat }: SavingsGoalsProps) {
  const [form, setForm] = useState<FormState>(CLOSED);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SavingsGoalProgress | null>(null);

  const openCreate = () => {
    setError(null);
    setForm({ ...CLOSED, open: true });
  };
  const openEdit = (goal: SavingsGoalProgress) => {
    setError(null);
    setForm({
      open: true,
      goal,
      name: goal.name,
      target: paiseToDecimalString(goal.targetAmount).replace(/\.00$/, ""),
      targetDate: goal.targetDate ?? "",
      categoryId: goal.categoryId ?? NONE,
      color: (CATEGORY_COLORS as readonly string[]).includes(goal.color) ? (goal.color as FormState["color"]) : "emerald",
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const targetAmount = parseMoney(form.target);
    if (!form.name.trim()) return setError("Give the goal a name");
    if (targetAmount === null || targetAmount <= 0) return setError("Enter a target amount greater than zero");
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      targetAmount,
      targetDate: form.targetDate || null,
      categoryId: form.categoryId === NONE ? null : form.categoryId,
      color: form.color,
    };
    try {
      const result = form.goal ? await updateSavingsGoalAction(form.goal.id, payload) : await createSavingsGoalAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(form.goal ? "Goal updated" : "Goal created", { description: payload.name });
      setForm(CLOSED);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (goal: SavingsGoalProgress) => {
    const result = await updateSavingsGoalAction(goal.id, { archived: true }).catch(() => null);
    if (!result || !result.ok) toast.error("Could not archive the goal", { description: result?.error });
    else toast.success("Goal archived", { description: goal.name });
  };

  const remove = async () => {
    if (!deleting) return;
    const result = await deleteSavingsGoalAction(deleting.id);
    if (!result.ok) {
      toast.error("Could not delete the goal", { description: result.error });
      throw new Error(result.error);
    }
    toast.success("Goal deleted");
  };

  const destinationItems = [{ value: NONE, label: "Whole savings balance" }, ...destinations.map((d) => ({ value: d.id, label: `Money added for ${d.name}` }))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings goals</CardTitle>
        <CardDescription>Unlinked goals track your whole savings balance. Link one to a savings category to count only money you add for it.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden />
            New goal
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="An emergency fund, a trip, a down payment: set a target and a date, and see what to save each month."
            compact
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" aria-hidden />
                Create a goal
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Savings goals">
            {goals.map((goal) => {
              const colour = categoryColorValue(goal.color);
              const width = Math.min(100, Math.max(0, goal.percentage));
              return (
                <li key={goal.id} className="min-w-0 rounded-xl border border-border bg-card-elevated p-4" data-testid="savings-goal">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: colour }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{goal.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {goal.categoryName ? `Money added for ${goal.categoryName}` : "Tracks your savings balance"}
                        {goal.targetDate && ` · by ${formatIsoDate(goal.targetDate, dateFormat)}`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for goal ${goal.name}`} />}>
                        <Ellipsis aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(goal)}>
                          <Pencil aria-hidden />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void archive(goal)}>
                          <Archive aria-hidden />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(goal)}>
                          <Trash aria-hidden />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-xl font-bold tabular-nums">{formatCurrency(goal.saved)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">of {formatCurrency(goal.targetAmount)}</span>
                  </p>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`${goal.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(width)}
                  >
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${width}%`, background: colour }} />
                  </div>
                  <p className={cn("mt-2 text-xs", goal.complete ? "font-semibold text-income-foreground" : "text-muted-foreground")}>
                    {goal.complete
                      ? "Goal reached"
                      : goal.monthlyNeeded === null
                        ? `${formatPercent(goal.percentage, 0)} · ${formatCurrency(goal.remaining)} to go`
                        : goal.monthsLeft === 0
                          ? `${formatCurrency(goal.remaining)} to go · target date passed`
                          : `${formatCurrency(goal.monthlyNeeded)}/month for ${goal.monthsLeft} month${goal.monthsLeft === 1 ? "" : "s"}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={form.open} onOpenChange={(open) => !open && setForm(CLOSED)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.goal ? "Edit goal" : "New savings goal"}</DialogTitle>
            <DialogDescription>Leave it unlinked to track your whole savings balance, or link a category to count money added for it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-name">Name</Label>
              <Input id="goal-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Emergency fund, Goa trip, new laptop…" maxLength={60} autoFocus />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="goal-target">Target</Label>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput id="goal-target" inputMode="decimal" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="3,00,000" />
                </InputGroup>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goal-date">
                  By <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="goal-date" type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-destination">Counts</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => {
                  const picked = destinations.find((d) => d.id === value);
                  setForm((f) => ({
                    ...f,
                    categoryId: value ?? NONE,
                    color: picked && (CATEGORY_COLORS as readonly string[]).includes(picked.color) ? (picked.color as FormState["color"]) : f.color,
                  }));
                }}
                items={destinationItems}
              >
                <SelectTrigger id="goal-destination" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Whole savings balance</SelectItem>
                  {destinations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <CategoryIcon icon={d.icon} color={d.color} size="sm" />
                      Money added for {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Colour</legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Goal colour">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={color}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={cn("size-6 rounded-full border-2 transition-transform", form.color === color ? "scale-110 border-foreground" : "border-transparent")}
                    style={{ background: categoryColorValue(color) }}
                  />
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForm(CLOSED)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : form.goal ? "Save goal" : "Create goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete "${deleting.name}"?` : "Delete goal"}
        description="Only the goal is removed. Your savings entries and notes stay as they are."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
