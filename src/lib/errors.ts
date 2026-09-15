/**
 * Application error carrying an HTTP status and a machine-readable code.
 * Services throw these; API routes and server actions translate them for the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static notFound(what = "Resource"): AppError {
    return new AppError(404, "not_found", `${what} not found`);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, "bad_request", message, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, "conflict", message, details);
  }

  static unavailable(message: string, details?: unknown): AppError {
    return new AppError(503, "unavailable", message, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError || (typeof error === "object" && error !== null && (error as { name?: string }).name === "AppError");
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
