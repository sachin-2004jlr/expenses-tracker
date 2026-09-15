import { asc, eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/db/defaults";
import { appSettings, categories, users } from "@/lib/db/schema";

/**
 * Current-user resolution.
 *
 * The app is single-user today: a "local" user row is created on first run. Every service takes
 * a `userId`, so plugging in real authentication later only changes this file: resolve the user
 * from the session instead of picking the default row.
 */

export const DEFAULT_USER_EMAIL = "local@expenses-tracker.local";

type UserGlobals = { __expensesUserId?: Promise<string> };
const globals = globalThis as unknown as UserGlobals;

export function getCurrentUserId(): Promise<string> {
  if (!globals.__expensesUserId) {
    globals.__expensesUserId = resolveDefaultUser().catch((error: unknown) => {
      globals.__expensesUserId = undefined;
      throw error;
    });
  }
  return globals.__expensesUserId;
}

async function resolveDefaultUser(): Promise<string> {
  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt)).limit(1);
  if (existing[0]) {
    await ensureUserDefaults(db, existing[0].id);
    return existing[0].id;
  }
  await db
    .insert(users)
    .values({ email: DEFAULT_USER_EMAIL, name: "Personal" })
    .onConflictDoNothing({ target: users.email });
  const created = await db.select({ id: users.id }).from(users).where(eq(users.email, DEFAULT_USER_EMAIL)).limit(1);
  const userId = created[0]?.id;
  if (!userId) throw new Error("Could not create the default user");
  await ensureUserDefaults(db, userId);
  return userId;
}

/** Idempotently create default categories and a settings row for a user. */
export async function ensureUserDefaults(db: Db, userId: string): Promise<void> {
  const existingCategories = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existingCategories.length === 0) {
    await db
      .insert(categories)
      .values(
        DEFAULT_CATEGORIES.map((category, index) => ({
          userId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          isDefault: true,
          sortOrder: index,
        })),
      )
      .onConflictDoNothing();
  }

  const existingSettings = await db
    .select({ id: appSettings.id })
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);
  if (existingSettings.length === 0) {
    const provider = process.env.AI_PROVIDER;
    await db
      .insert(appSettings)
      .values({
        userId,
        timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
        aiProvider: provider === "openai-compatible" || provider === "mock" ? provider : "ollama",
        ollamaUrl: (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, ""),
        ollamaModel: process.env.OLLAMA_MODEL || null,
      })
      .onConflictDoNothing({ target: appSettings.userId });
  }
}

/** Test/reset helper: forget the memoised user so the next call re-resolves. */
export function resetCurrentUserCache(): void {
  globals.__expensesUserId = undefined;
}
