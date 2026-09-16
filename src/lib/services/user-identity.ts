import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/db/defaults";
import { appSettings, categories, users } from "@/lib/db/schema";

/**
 * User rows and their default data. Kept separate from `user.ts` so the auth layer can
 * import it without a circular dependency.
 */

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

export interface IdentityProfile {
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Find or create the application user for a signed-in identity (matched by e-mail) and
 * return its id. Name and avatar are refreshed from the provider on every sign-in.
 */
export async function ensureUserForIdentity(profile: IdentityProfile): Promise<string> {
  const email = profile.email.trim().toLowerCase();
  const db = await getDb();
  await db
    .insert(users)
    .values({ email, name: profile.name ?? null, image: profile.image ?? null })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: profile.name ?? null, image: profile.image ?? null, updatedAt: new Date() },
    });
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const userId = rows[0]?.id;
  if (!userId) throw new Error("Could not resolve the signed-in user");
  await ensureUserDefaults(db, userId);
  return userId;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
