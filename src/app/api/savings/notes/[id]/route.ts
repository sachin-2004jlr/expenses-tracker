import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { deleteSavingsNote, updateSavingsNote } from "@/lib/services/savings-notes";
import { getCurrentUserId } from "@/lib/services/user";
import { savingsNoteUpdateSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

const idSchema = z.uuid("Invalid note id");
type Context = { params: Promise<{ id: string }> };

/** PATCH /api/savings/notes/:id { title?, body?, date?, pinned? } */
export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const update = savingsNoteUpdateSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const note = await updateSavingsNote(userId, idSchema.parse(id), update);
    revalidatePath("/", "layout");
    return jsonOk(note);
  });
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    await deleteSavingsNote(userId, idSchema.parse(id));
    revalidatePath("/", "layout");
    return jsonOk({ id });
  });
}
