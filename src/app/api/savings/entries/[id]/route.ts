import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { deleteSavingsEntry, getSavingsEntry, updateSavingsEntry } from "@/lib/services/savings-entries";
import { getCurrentUserId } from "@/lib/services/user";
import { savingsEntryInputSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

const idSchema = z.uuid("Invalid savings entry id");
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    return jsonOk(await getSavingsEntry(await getCurrentUserId(), idSchema.parse(id)));
  });
}

/** PATCH /api/savings/entries/:id → full update (same body as create). */
export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const input = savingsEntryInputSchema.parse(await readJson(request));
    const entry = await updateSavingsEntry(await getCurrentUserId(), idSchema.parse(id), input);
    revalidatePath("/savings", "layout");
    return jsonOk(entry);
  });
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const entry = await deleteSavingsEntry(await getCurrentUserId(), idSchema.parse(id));
    revalidatePath("/savings", "layout");
    return jsonOk({ id: entry.id });
  });
}
