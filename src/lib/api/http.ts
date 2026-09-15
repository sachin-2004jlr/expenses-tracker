import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { AppError, isAppError } from "@/lib/errors";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(status: number, code: string, message: string, details?: unknown): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function formatZodIssues(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}

/** Wrap a route handler so every failure becomes a well-formed JSON error response. */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "validation_error", "Invalid request", formatZodIssues(error));
    }
    if (isAppError(error)) {
      return jsonError(error.status, error.code, error.message, error.details);
    }
    if (isDatabaseUnavailableError(error)) {
      return jsonError(503, "database_unavailable", error.message);
    }
    console.error("[api] Unhandled error", error);
    return jsonError(500, "internal_error", "Something went wrong on the server");
  }
}

/** Parse a JSON body; malformed JSON becomes a 400 instead of a crash. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.badRequest("Request body must be valid JSON");
  }
}

export function searchParamsToObject(url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}
