import { revalidatePath } from "next/cache";
import { handleRoute, jsonCreated, jsonOk, readJson } from "@/lib/api/http";
import { createCategory, listCategoriesWithStats } from "@/lib/services/categories";
import { getCurrentUserId } from "@/lib/services/user";
import { categoryInputSchema } from "@/lib/validation/category";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    return jsonOk(await listCategoriesWithStats(userId));
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = categoryInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const created = await createCategory(userId, input);
    revalidatePath("/", "layout");
    return jsonCreated(created);
  });
}
