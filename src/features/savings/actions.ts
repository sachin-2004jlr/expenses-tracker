"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import { createSavingsGoal, deleteSavingsGoal, updateSavingsGoal } from "@/lib/services/savings";
import { createSavingsEntry, deleteSavingsEntry, updateSavingsEntry } from "@/lib/services/savings-entries";
import { createSavingsNote, deleteSavingsNote, updateSavingsNote } from "@/lib/services/savings-notes";
import { getCurrentUserId } from "@/lib/services/user";
import type { SavingsEntryInput, SavingsGoalInput, SavingsGoalUpdate, SavingsNoteInput, SavingsNoteUpdate } from "@/lib/validation/savings";
import type { SavingsEntry, SavingsGoal, SavingsNote } from "@/types";

/** Savings never feed the monthly tracker, so only the savings pages need fresh data. */
function refreshSavings(): void {
  revalidatePath("/savings", "layout");
}

export async function createSavingsEntryAction(input: SavingsEntryInput): Promise<ActionResult<SavingsEntry>> {
  return runAction(async () => {
    const entry = await createSavingsEntry(await getCurrentUserId(), input);
    refreshSavings();
    return entry;
  });
}

export async function updateSavingsEntryAction(id: string, input: SavingsEntryInput): Promise<ActionResult<SavingsEntry>> {
  return runAction(async () => {
    const entry = await updateSavingsEntry(await getCurrentUserId(), id, input);
    refreshSavings();
    return entry;
  });
}

export async function deleteSavingsEntryAction(id: string): Promise<ActionResult<SavingsEntry>> {
  return runAction(async () => {
    const entry = await deleteSavingsEntry(await getCurrentUserId(), id);
    refreshSavings();
    return entry;
  });
}

export async function createSavingsNoteAction(input: SavingsNoteInput): Promise<ActionResult<SavingsNote>> {
  return runAction(async () => {
    const note = await createSavingsNote(await getCurrentUserId(), input);
    refreshSavings();
    return note;
  });
}

export async function updateSavingsNoteAction(id: string, update: SavingsNoteUpdate): Promise<ActionResult<SavingsNote>> {
  return runAction(async () => {
    const note = await updateSavingsNote(await getCurrentUserId(), id, update);
    refreshSavings();
    return note;
  });
}

export async function deleteSavingsNoteAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await deleteSavingsNote(await getCurrentUserId(), id);
    refreshSavings();
    return { id };
  });
}

export async function createSavingsGoalAction(input: SavingsGoalInput): Promise<ActionResult<SavingsGoal>> {
  return runAction(async () => {
    const goal = await createSavingsGoal(await getCurrentUserId(), input);
    refreshSavings();
    return goal;
  });
}

export async function updateSavingsGoalAction(id: string, update: SavingsGoalUpdate): Promise<ActionResult<SavingsGoal>> {
  return runAction(async () => {
    const goal = await updateSavingsGoal(await getCurrentUserId(), id, update);
    refreshSavings();
    return goal;
  });
}

export async function deleteSavingsGoalAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await deleteSavingsGoal(await getCurrentUserId(), id);
    refreshSavings();
    return { id };
  });
}
