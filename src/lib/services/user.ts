import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { auth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { ensureUserDefaults } from "./user-identity";

export { ensureUserDefaults } from "./user-identity";

/**
 * Current-user resolution.
 *
 * - When Google sign-in is configured (AUTH_SECRET + AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET) the
 *   user comes from the Auth.js session; unauthenticated requests get a 401 AppError, which API
 *   routes turn into JSON and the app layout turns into a redirect to /login.
 * - Otherwise (local development, tests, CI) a single "local" user row is used, so the app
 *   works with zero configuration.
 *
 * Every service takes a `userId`, so this file is the only place that knows about sessions.
 */

export const DEFAULT_USER_EMAIL = "local@expenses-tracker.local";

type UserGlobals = { __expensesUserId?: Promise<string> };
const globals = globalThis as unknown as UserGlobals;

/** Resolve the current user's id, memoised per request. */
export const getCurrentUserId = cache(async (): Promise<string> => {
  if (isAuthConfigured()) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new AppError(401, "unauthenticated", "Sign in to continue");
    return userId;
  }
  return getDefaultUserId();
});

/** Id of the zero-config local user (created on first use). */
export function getDefaultUserId(): Promise<string> {
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
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEFAULT_USER_EMAIL))
    .orderBy(asc(users.createdAt))
    .limit(1);
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

/** Test/reset helper: forget the memoised local user so the next call re-resolves. */
export function resetCurrentUserCache(): void {
  globals.__expensesUserId = undefined;
}
