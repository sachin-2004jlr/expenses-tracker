import { revalidatePath } from "next/cache";
import { handleRoute, jsonCreated, jsonOk, readJson } from "@/lib/api/http";
import { createSavingsNote, listSavingsNotes } from "@/lib/services/savings-notes";
import { getCurrentUserId } from "@/lib/services/user";
import { savingsNoteInputSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

/** GET /api/savings/notes?q= → savings journal, pinned first then newest. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    return jsonOk(await listSavingsNotes(userId, { q: q?.slice(0, 100) }));
  });
}

/** POST /api/savings/notes { title?, body, date, pinned?, transactionId? } */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = savingsNoteInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const note = await createSavingsNote(userId, input);
    revalidatePath("/", "layout");
    return jsonCreated(note);
  });
}
