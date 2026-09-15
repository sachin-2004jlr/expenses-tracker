import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { importBackup } from "@/lib/services/export-import";
import { getCurrentUserId } from "@/lib/services/user";
import { importModeSchema, validateBackup } from "@/lib/validation/import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

const bodySchema = z.object({
  mode: importModeSchema.default("merge"),
  /** When true only validate and report counts; nothing is written. */
  dryRun: z.boolean().default(false),
  backup: z.unknown(),
});

/** POST /api/import { mode, dryRun, backup } → validated import of a JSON backup. */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new AppError(413, "too_large", "Backup file is larger than 25 MB");
    const body = bodySchema.parse(await readJson(request));

    if (body.dryRun) {
      const validation = validateBackup(body.backup);
      if (!validation.ok || !validation.data) {
        throw new AppError(400, "invalid_backup", "The backup file is invalid", validation.issues);
      }
      return jsonOk({
        ok: true,
        transactions: validation.data.transactions.length,
        categories: validation.data.categories.length,
        recurring: validation.data.recurring.length,
      });
    }

    const userId = await getCurrentUserId();
    const result = await importBackup(userId, body.backup, body.mode);
    revalidatePath("/", "layout");
    return jsonOk(result);
  });
}
