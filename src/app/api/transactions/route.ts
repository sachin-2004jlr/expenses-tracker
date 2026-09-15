import { revalidatePath } from "next/cache";
import { handleRoute, jsonCreated, jsonOk, readJson, searchParamsToObject } from "@/lib/api/http";
import { createTransaction, listTransactions } from "@/lib/services/transactions";
import { getCurrentUserId } from "@/lib/services/user";
import { parseTransactionFilters, transactionInputSchema } from "@/lib/validation/transaction";

export const dynamic = "force-dynamic";

/** GET /api/transactions?q=&type=&category=&month=&from=&to=&min=&max=&tags=&sort=&dir=&page=&pageSize= */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const filters = parseTransactionFilters(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    return jsonOk(await listTransactions(userId, filters));
  });
}

/** POST /api/transactions → create (amount in integer paise). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = transactionInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const created = await createTransaction(userId, input);
    revalidatePath("/", "layout");
    return jsonCreated(created);
  });
}
