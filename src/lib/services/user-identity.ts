import { getDb, type Db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/db/defaults";
import { newId } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { defaultSettingsDoc } from "./settings";

/**
 * Account documents (e-mail + password) and their default data. Kept separate from `user.ts`
 * so the auth layer can import it without a circular dependency.
 */

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number }).code === 11000;
}

/** Idempotently create default categories and a settings document for a user. */
export async function ensureUserDefaults(db: Db, userId: string): Promise<void> {
  const now = new Date();
  // Seed the defaults of every type the user has no categories for yet. Existing accounts created
  // before SAVINGS existed get the savings destinations this way without touching their others.
  const existingTypes = new Set((await db.categories.distinct("type", { userId })) as string[]);
  const missing = DEFAULT_CATEGORIES.map((category, index) => ({ category, index })).filter(({ category }) => !existingTypes.has(category.type));
  if (missing.length > 0) {
    await db.categories
      .insertMany(
        missing.map(({ category, index }) => ({
          _id: newId(),
          userId,
          name: category.name,
          nameLower: category.name.toLowerCase(),
          type: category.type,
          icon: category.icon,
          color: category.color,
          isDefault: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
        { ordered: false },
      )
      .catch((error: unknown) => {
        // Duplicate-key errors mean a parallel request seeded first; that is fine.
        if (!isDuplicateKey(error)) throw error;
      });
  }

  const hasSettings = await db.settings.countDocuments({ userId }, { limit: 1 });
  if (hasSettings === 0) {
    await db.settings.insertOne(defaultSettingsDoc(userId)).catch((error: unknown) => {
      if (!isDuplicateKey(error)) throw error;
    });
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
  const doc = await db.users.findOne({ email: normaliseEmail(email) });
  if (!doc) return null;
  return { id: doc._id, email: doc.email, name: doc.name, image: doc.image, passwordHash: doc.passwordHash };
}

/** Create an account. Throws a 409 AppError when the e-mail is already registered. */
export async function createUserWithPassword(input: { name: string; email: string; password: string }): Promise<string> {
  const email = normaliseEmail(input.email);
  const db = await getDb();
  if (await findUserByEmail(email)) throw AppError.conflict("An account with this e-mail already exists");
  const now = new Date();
  const id = newId();
  try {
    await db.users.insertOne({
      _id: id,
      email,
      name: input.name.trim(),
      image: null,
      passwordHash: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw AppError.conflict("An account with this e-mail already exists");
    throw error;
  }
  await ensureUserDefaults(db, id);
  return id;
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
  const doc = await db.users.findOne({ _id: userId }, { projection: { passwordHash: 1 } });
  return verifyPassword(password, doc?.passwordHash);
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const db = await getDb();
  await db.users.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(password), updatedAt: new Date() } });
}

export async function updateUserProfile(userId: string, profile: { name: string }): Promise<UserProfile> {
  const db = await getDb();
  const result = await db.users.findOneAndUpdate(
    { _id: userId },
    { $set: { name: profile.name.trim(), updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw AppError.notFound("User");
  return { id: result._id, email: result.email, name: result.name, image: result.image };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await getDb();
  const doc = await db.users.findOne({ _id: userId });
  return doc ? { id: doc._id, email: doc.email, name: doc.name, image: doc.image } : null;
}

export const DEMO_ACCOUNT = { email: "demo@expenses.local", password: "demo12345", name: "Demo" } as const;

/** Create (or find) the demo account used by `npm run db:seed`. */
export async function ensureDemoAccount(): Promise<{ id: string; email: string; password: string }> {
  const existing = await findUserByEmail(DEMO_ACCOUNT.email);
  if (existing) {
    await ensureUserDefaults(await getDb(), existing.id);
    return { id: existing.id, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };
  }
  const id = await createUserWithPassword(DEMO_ACCOUNT);
  return { id, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };
}
