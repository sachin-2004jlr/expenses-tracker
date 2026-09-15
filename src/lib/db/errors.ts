/** Thrown when no database is reachable/configured. Rendered as a friendly setup screen. */
export class DatabaseUnavailableError extends Error {
  readonly kind: "not-configured" | "connection-failed";

  constructor(kind: "not-configured" | "connection-failed", message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "DatabaseUnavailableError";
    this.kind = kind;
  }
}

export function isDatabaseUnavailableError(error: unknown): error is DatabaseUnavailableError {
  return (
    error instanceof DatabaseUnavailableError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "DatabaseUnavailableError")
  );
}
