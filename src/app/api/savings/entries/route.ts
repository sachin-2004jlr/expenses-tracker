import { revalidatePath } from "next/cache";
import { handleRoute, jsonCreated, jsonOk, readJson, searchParamsToObject } from "@/lib/api/http";
import { createSavingsEntry, listSavingsEntries } from "@/lib/services/savings-entries";
import { getCurrentUserId } from "@/lib/services/user";
import { parseSavingsEntryFilters, savingsEntryInputSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

/** GET /api/savings/entries?kind=DEPOSIT|SPEND&month=&q=&page=&pageSize= */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const filters = parseSavingsEntryFilters(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    return jsonOk(await listSavingsEntries(userId, filters));
  });
}

/** POST /api/savings/entries { kind, amount (paise), description, categoryId?, date, journal? } */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = savingsEntryInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const entry = await createSavingsEntry(userId, input);
    revalidatePath("/savings", "layout");
    return jsonCreated(entry);
  });
}
