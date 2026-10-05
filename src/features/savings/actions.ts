"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import { createSavingsGoal, deleteSavingsGoal, updateSavingsGoal } from "@/lib/services/savings";
import { createSavingsNote, deleteSavingsNote, updateSavingsNote } from "@/lib/services/savings-notes";
import { getCurrentUserId } from "@/lib/services/user";
import type { SavingsGoalInput, SavingsGoalUpdate, SavingsNoteInput, SavingsNoteUpdate } from "@/lib/validation/savings";
import type { SavingsGoal, SavingsNote } from "@/types";

function refreshAll(): void {
  revalidatePath("/", "layout");
}

export async function createSavingsNoteAction(input: SavingsNoteInput): Promise<ActionResult<SavingsNote>> {
  return runAction(async () => {
    const note = await createSavingsNote(await getCurrentUserId(), input);
    refreshAll();
    return note;
  });
}

export async function updateSavingsNoteAction(id: string, update: SavingsNoteUpdate): Promise<ActionResult<SavingsNote>> {
  return runAction(async () => {
    const note = await updateSavingsNote(await getCurrentUserId(), id, update);
    refreshAll();
    return note;
  });
}

export async function deleteSavingsNoteAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await deleteSavingsNote(await getCurrentUserId(), id);
    refreshAll();
    return { id };
  });
}

export async function createSavingsGoalAction(input: SavingsGoalInput): Promise<ActionResult<SavingsGoal>> {
  return runAction(async () => {
    const goal = await createSavingsGoal(await getCurrentUserId(), input);
    refreshAll();
    return goal;
  });
}

export async function updateSavingsGoalAction(id: string, update: SavingsGoalUpdate): Promise<ActionResult<SavingsGoal>> {
  return runAction(async () => {
    const goal = await updateSavingsGoal(await getCurrentUserId(), id, update);
    refreshAll();
    return goal;
  });
}

export async function deleteSavingsGoalAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await deleteSavingsGoal(await getCurrentUserId(), id);
    refreshAll();
    return { id };
  });
}
