import { getDb } from "@/lib/db";
import { newId, type AppSettingsDoc } from "@/lib/db/schema";
import { settingsUpdateSchema, type SettingsUpdate } from "@/lib/validation/settings";
import type { AppSettings } from "@/types";

export function toSettings(doc: AppSettingsDoc): AppSettings {
  const provider = doc.aiProvider;
  return {
    currency: doc.currency,
    locale: doc.locale,
    dateFormat: doc.dateFormat,
    firstDayOfWeek: doc.firstDayOfWeek === 0 ? 0 : 1,
    timeZone: doc.timeZone,
    aiEnabled: doc.aiEnabled,
    aiProvider: provider === "openai-compatible" || provider === "mock" ? provider : "ollama",
    ollamaUrl: doc.ollamaUrl,
    ollamaModel: doc.ollamaModel,
    aiAutoAnalyze: doc.aiAutoAnalyze,
  };
}

function defaultDoc(userId: string): AppSettingsDoc {
  const provider = process.env.AI_PROVIDER;
  const now = new Date();
  return {
    _id: newId(),
    userId,
    currency: "INR",
    locale: "en-IN",
    dateFormat: "dd MMM yyyy",
    firstDayOfWeek: 1,
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
    aiEnabled: true,
    aiProvider: provider === "openai-compatible" || provider === "mock" ? provider : "ollama",
    ollamaUrl: (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, ""),
    ollamaModel: process.env.OLLAMA_MODEL || null,
    aiAutoAnalyze: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getSettings(userId: string): Promise<AppSettings> {
  const db = await getDb();
  const existing = await db.settings.findOne({ userId });
  if (existing) return toSettings(existing);
  const doc = defaultDoc(userId);
  try {
    await db.settings.insertOne(doc);
    return toSettings(doc);
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const again = await db.settings.findOne({ userId });
    return toSettings(again ?? doc);
  }
}

export async function updateSettings(userId: string, rawUpdate: SettingsUpdate): Promise<AppSettings> {
  const update = settingsUpdateSchema.parse(rawUpdate);
  const db = await getDb();
  await getSettings(userId); // make sure the document exists
  const $set: Partial<AppSettingsDoc> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) ($set as Record<string, unknown>)[key] = value;
  }
  const result = await db.settings.findOneAndUpdate({ userId }, { $set }, { returnDocument: "after" });
  return toSettings(result ?? defaultDoc(userId));
}
