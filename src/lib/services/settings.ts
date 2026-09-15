import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, type AppSettingsRow } from "@/lib/db/schema";
import { settingsUpdateSchema, type SettingsUpdate } from "@/lib/validation/settings";
import type { AppSettings } from "@/types";

export function toSettings(row: AppSettingsRow): AppSettings {
  const provider = row.aiProvider;
  return {
    currency: row.currency,
    locale: row.locale,
    dateFormat: row.dateFormat,
    firstDayOfWeek: row.firstDayOfWeek === 0 ? 0 : 1,
    timeZone: row.timeZone,
    aiEnabled: row.aiEnabled,
    aiProvider: provider === "openai-compatible" || provider === "mock" ? provider : "ollama",
    ollamaUrl: row.ollamaUrl,
    ollamaModel: row.ollamaModel,
    aiAutoAnalyze: row.aiAutoAnalyze,
  };
}

export async function getSettings(userId: string): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
  if (rows[0]) return toSettings(rows[0]);
  const [created] = await db
    .insert(appSettings)
    .values({ userId })
    .onConflictDoNothing({ target: appSettings.userId })
    .returning();
  if (created) return toSettings(created);
  const again = await db.select().from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
  return toSettings(again[0]!);
}

export async function updateSettings(userId: string, rawUpdate: SettingsUpdate): Promise<AppSettings> {
  const update = settingsUpdateSchema.parse(rawUpdate);
  const db = await getDb();
  await getSettings(userId); // make sure the row exists
  const [row] = await db.update(appSettings).set(update).where(eq(appSettings.userId, userId)).returning();
  return toSettings(row!);
}
