import { cache } from "react";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export { ensureUserDefaults } from "./user-identity";

/**
 * Current-user resolution: the signed-in account from the Auth.js session.
 * Unauthenticated requests get a 401 AppError, which API routes turn into JSON and the app
 * layout turns into a redirect to /login. Every service takes a `userId`, so this is the only
 * place that knows about sessions.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AppError(401, "unauthenticated", "Sign in to continue");
  return userId;
});
