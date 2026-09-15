import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { deleteTransaction, duplicateTransaction, getTransaction, updateTransaction } from "@/lib/services/transactions";
import { getCurrentUserId } from "@/lib/services/user";
import { isoDateSchema, transactionInputSchema } from "@/lib/validation/transaction";

export const dynamic = "force-dynamic";

const idSchema = z.uuid("Invalid transaction id");

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    return jsonOk(await getTransaction(userId, idSchema.parse(id)));
  });
}

/** PATCH /api/transactions/:id → full update (all fields required, same as create). */
export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const input = transactionInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const updated = await updateTransaction(userId, idSchema.parse(id), input);
    revalidatePath("/", "layout");
    return jsonOk(updated);
  });
}

export const PUT = PATCH;

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    const result = await deleteTransaction(userId, idSchema.parse(id));
    revalidatePath("/", "layout");
    return jsonOk(result);
  });
}

/** POST /api/transactions/:id { action: "duplicate", date? } */
export async function POST(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const body = z
      .object({ action: z.literal("duplicate"), date: isoDateSchema.optional() })
      .parse(await readJson(request));
    const userId = await getCurrentUserId();
    const copy = await duplicateTransaction(userId, idSchema.parse(id), body.date ? { date: body.date } : {});
    revalidatePath("/", "layout");
    return jsonOk(copy, { status: 201 });
  });
}
