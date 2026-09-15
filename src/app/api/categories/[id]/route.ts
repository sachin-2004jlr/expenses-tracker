import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson, searchParamsToObject } from "@/lib/api/http";
import { deleteCategory, getCategory, updateCategory } from "@/lib/services/categories";
import { getCurrentUserId } from "@/lib/services/user";
import { categoryDeleteSchema, categoryUpdateSchema } from "@/lib/validation/category";

export const dynamic = "force-dynamic";

const idSchema = z.uuid("Invalid category id");
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    return jsonOk(await getCategory(userId, idSchema.parse(id)));
  });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const update = categoryUpdateSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const updated = await updateCategory(userId, idSchema.parse(id), update);
    revalidatePath("/", "layout");
    return jsonOk(updated);
  });
}

/** DELETE /api/categories/:id?reassignTo=<categoryId> */
export async function DELETE(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const options = categoryDeleteSchema.parse(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    const result = await deleteCategory(userId, idSchema.parse(id), options);
    revalidatePath("/", "layout");
    return jsonOk(result);
  });
}
