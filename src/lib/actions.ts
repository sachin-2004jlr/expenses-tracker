import { ZodError } from "zod";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { errorMessage, isAppError } from "@/lib/errors";

/**
 * Uniform result type for server actions. Actions never throw to the client; they return this
 * so forms can show inline errors and toasts without an error boundary tripping.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.map(String).join(".") || "_";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: "Please fix the highlighted fields", code: "validation_error", fieldErrors };
    }
    if (isAppError(error)) {
      return { ok: false, error: error.message, code: error.code };
    }
    if (isDatabaseUnavailableError(error)) {
      return { ok: false, error: error.message, code: "database_unavailable" };
    }
    console.error("[action] Unhandled error", error);
    return { ok: false, error: errorMessage(error), code: "internal_error" };
  }
}
