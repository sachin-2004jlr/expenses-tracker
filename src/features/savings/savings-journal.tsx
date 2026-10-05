"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { NotebookPen, Pencil, Pin, PinOff, Search, Trash, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatIsoDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { IsoDate, SavingsNote, Transaction } from "@/types";
import { createSavingsNoteAction, deleteSavingsNoteAction, updateSavingsNoteAction } from "./actions";

export interface SavingsJournalProps {
  notes: SavingsNote[];
  /** Recent savings entries that have no note yet. */
  pendingEntries: Transaction[];
  today: IsoDate;
  dateFormat: string;
}

interface Draft {
  title: string;
  body: string;
  date: IsoDate;
  transactionId: string | null;
}

/**
 * The savings notepad: write what you did with saved money, attach a note to a savings entry,
 * pin the important ones, search, edit in place.
 */
export function SavingsJournal({ notes, pendingEntries, today, dateFormat }: SavingsJournalProps) {
  const empty: Draft = { title: "", body: "", date: today, transactionId: null };
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ title: string; body: string; date: IsoDate }>({ title: "", body: "", date: today });
  const [deleting, setDeleting] = useState<SavingsNote | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const linked = pendingEntries.find((e) => e.id === draft.transactionId) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => `${n.title} ${n.body} ${n.transaction?.description ?? ""} ${n.transaction?.category.name ?? ""}`.toLowerCase().includes(q));
  }, [notes, query]);

  const startFor = (entry: Transaction) => {
    setDraft({ title: entry.description, body: "", date: entry.date, transactionId: entry.id });
    setError(null);
    bodyRef.current?.focus();
    bodyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.body.trim()) {
      setError("Write something first");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createSavingsNoteAction(draft);
      if (!result.ok) {
        setError(result.fieldErrors?.body ?? result.error);
        return;
      }
      setDraft(empty);
      toast.success("Note saved to your savings journal");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (note: SavingsNote) => {
    setEditingId(note.id);
    setEdit({ title: note.title, body: note.body, date: note.date });
  };

  const saveEdit = async (note: SavingsNote) => {
    if (!edit.body.trim()) {
      toast.error("A note can not be empty. Delete it instead.");
      return;
    }
    const result = await updateSavingsNoteAction(note.id, edit).catch(() => null);
    if (!result || !result.ok) {
      toast.error("Could not save the note", { description: result?.error });
      return;
    }
    setEditingId(null);
    toast.success("Note updated");
  };

  const togglePin = async (note: SavingsNote) => {
    const result = await updateSavingsNoteAction(note.id, { pinned: !note.pinned }).catch(() => null);
    if (!result || !result.ok) toast.error("Could not update the note", { description: result?.error });
  };

  const remove = async () => {
    if (!deleting) return;
    const result = await deleteSavingsNoteAction(deleting.id);
    if (!result.ok) {
      toast.error("Could not delete the note", { description: result.error });
      throw new Error(result.error);
    }
    toast.success("Note deleted");
  };

  return (
    <Card id="journal" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4 text-saved-foreground" aria-hidden />
          Savings journal
        </CardTitle>
        <CardDescription>Your notepad for what you did with the money you saved: where it went, rates, maturity dates, plans.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card-elevated p-3" data-testid="journal-composer">
          {linked && (
            <div className="flex items-center gap-2 rounded-lg bg-saved/10 px-2.5 py-1.5 text-xs">
              <CategoryIcon icon={linked.category.icon} color={linked.category.color} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                Note for <span className="font-semibold text-saved-foreground">{formatCurrency(linked.amount)}</span> → {linked.category.name} ·{" "}
                {formatIsoDate(linked.date, dateFormat)}
              </span>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, transactionId: null }))}
                aria-label="Do not link this note to the entry"
                className="rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="journal-title" className="sr-only">
                Title
              </Label>
              <Input id="journal-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Title (optional)" maxLength={120} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="journal-date" className="sr-only">
                Date
              </Label>
              <Input id="journal-date" type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value || today }))} />
            </div>
          </div>
          <Label htmlFor="journal-body" className="sr-only">
            Note
          </Label>
          <Textarea
            id="journal-body"
            ref={bodyRef}
            rows={4}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="What did you do with your savings? e.g. Moved ₹50,000 into a 1-year FD at 7.1%, matures Oct 2027. Started a ₹5,000 SIP in the index fund."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "journal-error" : undefined}
            maxLength={5000}
          />
          {error && (
            <p id="journal-error" role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">{draft.body.length}/5000</span>
            <div className="flex gap-2">
              {(draft.body || draft.title || draft.transactionId) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(empty)} disabled={saving}>
                  Clear
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving} className="bg-saved text-white hover:bg-saved/90">
                {saving ? "Saving…" : "Save note"}
              </Button>
            </div>
          </div>
        </form>

        {pendingEntries.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Savings without a note</p>
            <ul className="flex flex-wrap gap-2">
              {pendingEntries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => startFor(entry)}
                    className={cn(
                      "flex max-w-full items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-xs transition-colors hover:border-saved hover:bg-saved/10",
                      draft.transactionId === entry.id ? "border-saved bg-saved/10" : "border-border",
                    )}
                  >
                    <span className="font-semibold text-saved-foreground tabular-nums">{formatCurrency(entry.amount)}</span>
                    <span className="truncate">→ {entry.category.name}</span>
                    <span className="text-muted-foreground">{formatIsoDate(entry.date, "d MMM")}</span>
                    <Pencil className="size-3 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3">
          {notes.length > 3 && (
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your notes" aria-label="Search savings notes" type="search" />
            </InputGroup>
          )}

          {notes.length === 0 ? (
            <EmptyState icon={NotebookPen} title="No notes yet" description="Write down what you do with your savings so you always know where your money is." compact />
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No notes match “{query}”.</p>
          ) : (
            <ul className="grid gap-3" aria-label="Savings notes">
              {visible.map((note) => (
                <li key={note.id} className={cn("rounded-xl border bg-card p-4", note.pinned ? "border-saved/40" : "border-border")} data-testid="journal-note">
                  {editingId === note.id ? (
                    <div className="grid gap-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                        <Input value={edit.title} onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))} placeholder="Title (optional)" aria-label="Note title" maxLength={120} />
                        <Input type="date" value={edit.date} onChange={(e) => setEdit((s) => ({ ...s, date: e.target.value || s.date }))} aria-label="Note date" />
                      </div>
                      <Textarea rows={5} value={edit.body} onChange={(e) => setEdit((s) => ({ ...s, body: e.target.value }))} aria-label="Note" maxLength={5000} autoFocus />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => void saveEdit(note)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {note.pinned && <Pin className="size-3 text-saved-foreground" aria-label="Pinned" />}
                            <time dateTime={note.date}>{formatIsoDate(note.date, dateFormat)}</time>
                            {note.transaction && (
                              <span className="inline-flex items-center gap-1">
                                · <span className="font-semibold text-saved-foreground tabular-nums">{formatCurrency(note.transaction.amount)}</span> → {note.transaction.category.name}
                              </span>
                            )}
                          </p>
                          {note.title && <h3 className="mt-1 break-words text-sm font-semibold">{note.title}</h3>}
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Button variant="ghost" size="icon-sm" onClick={() => void togglePin(note)} aria-label={note.pinned ? "Unpin note" : "Pin note"}>
                            {note.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => beginEdit(note)} aria-label="Edit note">
                            <Pencil aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(note)} aria-label="Delete note">
                            <Trash aria-hidden />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{note.body}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this note?"
        description="The note is removed from your savings journal. The savings entry itself is not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
