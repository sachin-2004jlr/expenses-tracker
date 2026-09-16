import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/db/defaults";
import { appSettings, categories, users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Account rows (e-mail + password) and their default data. Kept separate from `user.ts` so the
 * auth layer can import it without a circular dependency.
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

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  passwordHash: string | null;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<AccountRecord | null> {
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normaliseEmail(email)))
    .limit(1);
  const row = rows[0];
  if (!row || !row.email) return null;
  return { ...row, email: row.email };
}

/** Create an account. Throws a 409 AppError when the e-mail is already registered. */
export async function createUserWithPassword(input: { name: string; email: string; password: string }): Promise<string> {
  const email = normaliseEmail(input.email);
  const db = await getDb();
  const existing = await findUserByEmail(email);
  if (existing) throw AppError.conflict("An account with this e-mail already exists");
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({ email, name: input.name.trim(), passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!row) throw AppError.conflict("An account with this e-mail already exists");
  await ensureUserDefaults(db, row.id);
  return row.id;
}

/** Verify a password for an existing account; returns the account on success. */
export async function authenticateUser(email: string, password: string): Promise<AccountRecord | null> {
  const account = await findUserByEmail(email);
  if (!account || !account.passwordHash) return null;
  const ok = await verifyPassword(password, account.passwordHash);
  return ok ? account : null;
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  return verifyPassword(password, rows[0]?.passwordHash);
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const db = await getDb();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserProfile(userId: string, profile: { name: string }): Promise<UserProfile> {
  const db = await getDb();
  const [row] = await db
    .update(users)
    .set({ name: profile.name.trim(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name, image: users.image });
  if (!row) throw AppError.notFound("User");
  return row;
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

export const DEMO_ACCOUNT = { email: "demo@expenses.local", password: "demo12345", name: "Demo" } as const;

/** Create (or find) the demo account used by `npm run db:seed`. */
export async function ensureDemoAccount(): Promise<{ id: string; email: string; password: string }> {
  const existing = await findUserByEmail(DEMO_ACCOUNT.email);
  if (existing) {
    const db = await getDb();
    await ensureUserDefaults(db, existing.id);
    return { id: existing.id, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };
  }
  const id = await createUserWithPassword(DEMO_ACCOUNT);
  return { id, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };
}
