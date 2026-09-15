import { z } from "zod";
import { handleRoute, searchParamsToObject } from "@/lib/api/http";
import { exportBackup, exportCsv } from "@/lib/services/export-import";
import { getCurrentUserId } from "@/lib/services/user";

export const dynamic = "force-dynamic";

const querySchema = z.object({ format: z.enum(["json", "csv"]).default("json") });

/** GET /api/export?format=json|csv → file download of all financial data. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const { format } = querySchema.parse(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = await exportCsv(userId);
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="expenses-${stamp}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    const backup = await exportBackup(userId);
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="expenses-backup-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  });
}
