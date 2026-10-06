"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Ellipsis, NotebookPen, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatIsoDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SavingsEntry } from "@/types";
import { createSavingsEntryAction, deleteSavingsEntryAction } from "./actions";
import { useSavingsDialog } from "./savings-dialog-provider";

export interface SavingsEntryListProps {
  entries: SavingsEntry[];
  dateFormat: string;
  /** Show the first lines of the journal note under each entry. */
  showJournal?: boolean;
}

/** Savings entries as tappable rows: green for money added, sky for money used. */
export function SavingsEntryList({ entries, dateFormat, showJournal = true }: SavingsEntryListProps) {
  const { openEdit } = useSavingsDialog();
  const [deleting, setDeleting] = useState<SavingsEntry | null>(null);

  const remove = async () => {
    if (!deleting) return;
    const snapshot = deleting;
    const result = await deleteSavingsEntryAction(snapshot.id);
    if (!result.ok) {
      toast.error("Could not delete", { description: result.error });
      throw new Error(result.error);
    }
    toast.success("Savings entry deleted", {
      description: snapshot.description,
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          void createSavingsEntryAction({
            kind: snapshot.kind,
            amount: snapshot.amount,
            description: snapshot.description,
            categoryId: snapshot.categoryId,
            date: snapshot.date,
          }).then((restored) => {
            if (restored.ok) toast.success("Savings entry restored");
            else toast.error("Could not restore", { description: restored.error });
          });
        },
      },
    });
  };

  return (
    <>
      <ul className="divide-y divide-border/70" aria-label="Savings entries">
        {entries.map((entry) => {
          const added = entry.kind === "DEPOSIT";
          const KindIcon = added ? ArrowDownToLine : ArrowUpFromLine;
          return (
            <li key={entry.id} className="flex items-start gap-2 py-2.5" data-testid="savings-entry">
              <button type="button" onClick={() => openEdit(entry)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Edit ${entry.description}`}>
                {entry.category ? (
                  <CategoryIcon icon={entry.category.icon} color={entry.category.color} />
                ) : (
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", added ? "bg-income/12 text-income-foreground" : "bg-saved/12 text-saved-foreground")}>
                    <KindIcon className="size-4" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-sm font-medium">{entry.description}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {added ? "Added" : "Used"}
                    {entry.category ? ` · ${entry.category.name}` : ""} · {formatIsoDate(entry.date, dateFormat)}
                  </span>
                  {showJournal && entry.journal && (
                    <span className="mt-1 flex items-start gap-1 text-xs text-foreground/80">
                      <NotebookPen className="mt-0.5 size-3 shrink-0 text-saved-foreground" aria-hidden />
                      <span className="line-clamp-2 whitespace-pre-wrap break-words">{entry.journal}</span>
                    </span>
                  )}
                </span>
                <span className={cn("shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums", added ? "text-income-foreground" : "text-saved-foreground")}>
                  {added ? "+" : "−"} {formatCurrency(entry.amount)}
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${entry.description}`} />}>
                  <Ellipsis aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(entry)}>
                    <Pencil aria-hidden />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(entry)}>
                    <Trash aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this savings entry?"
        description="Its journal note is kept in your journal. You can undo from the notification for a few seconds."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
