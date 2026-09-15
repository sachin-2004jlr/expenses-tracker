"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiStatus } from "@/types";

export interface UseAiStatusResult {
  status: AiStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

async function fetchStatus(signal?: AbortSignal): Promise<AiStatus> {
  const response = await fetch("/api/ai/status", { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as AiStatus;
}

/** Fetches `/api/ai/status` once on mount (and on demand). The server caches model lists briefly. */
export function useAiStatus(options: { auto?: boolean } = {}): UseAiStatusResult {
  const { auto = true } = options;
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auto) return;
    const controller = new AbortController();
    fetchStatus(controller.signal)
      .then((next) => {
        setStatus(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not check AI status");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auto]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check AI status");
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, error, refresh };
}
