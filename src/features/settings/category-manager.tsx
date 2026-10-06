"use client";

import { useState } from "react";
import { Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLOR_CLASSES, CategoryIcon, getCategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/db/defaults";
import { cn } from "@/lib/utils";
import type { CategoryWithStats, CategoryType } from "@/types";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

interface EditorState {
  open: boolean;
  category: CategoryWithStats | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

const EMPTY: EditorState = { open: false, category: null, name: "", type: "EXPENSE", icon: "tag", color: "slate" };

export function CategoryManager({ categories }: { categories: CategoryWithStats[] }) {
  const [editor, setEditor] = useState<EditorState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryWithStats | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");

  const openCreate = (type: CategoryType) => setEditor({ ...EMPTY, open: true, type });
  const openEdit = (category: CategoryWithStats) =>
    setEditor({ open: true, category, name: category.name, type: category.type, icon: category.icon, color: category.color });

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = { name: editor.name.trim(), type: editor.type, icon: editor.icon as (typeof CATEGORY_ICONS)[number], color: editor.color as (typeof CATEGORY_COLORS)[number] };
    const result = editor.category ? await updateCategoryAction(editor.category.id, payload) : await createCategoryAction(payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.fieldErrors?.name ?? result.error);
      return;
    }
    toast.success(editor.category ? "Category updated" : "Category created", { description: result.data.name });
    setEditor(EMPTY);
  };

  const remove = async () => {
    if (!deleting) return;
    const result = await deleteCategoryAction(deleting.id, deleting.transactionCount > 0 ? reassignTo || undefined : undefined);
    if (!result.ok) {
      toast.error("Could not delete category", { description: result.error });
      return;
    }
    toast.success("Category deleted", {
      description: result.data.reassignedTransactions > 0 ? `${result.data.reassignedTransactions} transactions moved.` : deleting.name,
    });
    setDeleting(null);
    setReassignTo("");
  };

  const groups: { type: CategoryType; title: string }[] = [
    { type: "INCOME", title: "Income categories" },
    { type: "EXPENSE", title: "Expense categories" },
    { type: "SAVINGS", title: "Savings categories" },
  ];
  const reassignOptions = deleting ? categories.filter((c) => c.type === deleting.type && c.id !== deleting.id) : [];

  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const items = categories.filter((c) => c.type === group.type);
        return (
          <Card key={group.type}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{items.length} categories</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline" onClick={() => openCreate(group.type)}>
                  <Plus data-icon="inline-start" aria-hidden />
                  Add
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1 sm:grid-cols-2">
                {items.map((category) => (
                  <li key={category.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{category.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {category.transactionCount} transaction{category.transactionCount === 1 ? "" : "s"}
                        {category.isDefault ? " · default" : ""}
                      </span>
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(category)} aria-label={`Edit ${category.name}`}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setDeleting(category);
                        setReassignTo("");
                      }}
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={editor.open} onOpenChange={(open) => !open && setEditor(EMPTY)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editor.category ? "Edit category" : `New ${editor.type === "INCOME" ? "income category" : editor.type === "EXPENSE" ? "expense category" : "savings category"}`}</DialogTitle>
            <DialogDescription>Pick a name, an icon and a colour.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={editor.name} onChange={(e) => setEditor((s) => ({ ...s, name: e.target.value }))} autoFocus maxLength={40} />
            </div>
            {!editor.category && (
              <div className="grid gap-1.5">
                <Label htmlFor="cat-type">Type</Label>
                <Select
                  value={editor.type}
                  onValueChange={(value) => setEditor((s) => ({ ...s, type: (value as CategoryType) ?? s.type }))}
                  items={[
                    { value: "EXPENSE", label: "Expense" },
                    { value: "INCOME", label: "Income" },
                    { value: "SAVINGS", label: "Savings" },
                  ]}
                >
                  <SelectTrigger id="cat-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">Icon</legend>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1" role="radiogroup" aria-label="Icon">
                {CATEGORY_ICONS.map((icon) => {
                  const Icon = getCategoryIcon(icon);
                  const active = editor.icon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={icon}
                      onClick={() => setEditor((s) => ({ ...s, icon }))}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        active ? "border-foreground bg-muted" : "border-transparent hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">Colour</legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
                {CATEGORY_COLORS.map((color) => {
                  const active = editor.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={color}
                      onClick={() => setEditor((s) => ({ ...s, color }))}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        CATEGORY_COLOR_CLASSES[color],
                        active ? "scale-110 border-foreground" : "border-transparent",
                      )}
                      style={{ background: `var(--color-${color}-500)` }}
                    />
                  );
                })}
              </div>
            </fieldset>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <CategoryIcon icon={editor.icon} color={editor.color} size="lg" />
              <span className="text-sm font-medium">{editor.name.trim() || "Preview"}</span>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditor(EMPTY)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !editor.name.trim()}>
                {saving ? "Saving…" : editor.category ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete "${deleting.name}"?` : "Delete category"}
        description={
          deleting && deleting.transactionCount > 0 ? (
            <span className="grid gap-2">
              <span>
                {deleting.transactionCount} transaction{deleting.transactionCount === 1 ? "" : "s"} use this category. Choose where to move them.
              </span>
              <Select value={reassignTo || null} onValueChange={(value) => setReassignTo(value ?? "")} items={reassignOptions.map((c) => ({ value: c.id, label: c.name }))}>
                <SelectTrigger className="w-full" aria-label="Move transactions to">
                  <SelectValue placeholder="Move transactions to…" />
                </SelectTrigger>
                <SelectContent>
                  {reassignOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          ) : (
            "This category has no transactions and will be removed."
          )
        }
        confirmLabel={deleting && deleting.transactionCount > 0 ? "Move & delete" : "Delete"}
        destructive
        onConfirm={async () => {
          if (deleting && deleting.transactionCount > 0 && !reassignTo) {
            toast.error("Choose a category to move the transactions to");
            throw new Error("reassign required");
          }
          await remove();
        }}
      />
    </div>
  );
}
