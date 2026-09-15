/**
 * Small in-memory sliding-window rate limiter for the AI endpoints.
 *
 * It is per-process (best effort on serverless), which is adequate for a personal app where the
 * goal is to stop a runaway client from hammering a local model, not to defend a public API.
 * Swap in Redis/Upstash for multi-instance deployments.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions, now = Date.now()): RateLimitResult {
  const { limit, windowMs } = options;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  const windowStart = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0]!;
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  bucket.timestamps.push(now);
  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 };
}

export const AI_RATE_LIMIT: RateLimitOptions = { limit: 30, windowMs: 60_000 };

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
