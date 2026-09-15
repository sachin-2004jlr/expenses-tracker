import { revalidatePath } from "next/cache";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { settingsUpdateSchema } from "@/lib/validation/settings";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    return jsonOk(await getSettings(userId));
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const update = settingsUpdateSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const settings = await updateSettings(userId, update);
    revalidatePath("/", "layout");
    return jsonOk(settings);
  });
}
