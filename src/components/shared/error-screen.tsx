"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { House, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTO_RELOAD_KEY = "expenses:auto-reload-at";

/**
 * A tab opened before a deploy still references the old build's JS chunks and server actions.
 * Those requests fail after the deploy; a single full reload picks up the new build.
 */
function isStaleDeployment(error: Error): boolean {
  return /Server Action|ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(`${error.name} ${error.message}`);
}

export interface ErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Adds the full-height centring used outside the app shell. */
  fullPage?: boolean;
}

/** Friendly recovery screen shared by every error boundary. Never shows raw server errors. */
export function ErrorScreen({ error, reset, fullPage }: ErrorScreenProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const stale = isStaleDeployment(error);

  useEffect(() => {
    console.error(error);
    if (!stale) return;
    // Reload once to load the new build; the timestamp stops a reload loop if the error persists.
    try {
      const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) ?? 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // Storage blocked: leave it to the Reload button.
    }
  }, [error, stale]);

  // Re-fetch the server components as well as re-rendering, so transient server errors recover.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className={fullPage ? "flex min-h-svh items-center justify-center bg-background px-4 text-foreground" : undefined}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center" role="alert">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{stale ? "A new version is available" : "Something went wrong"}</h2>
          <p className="text-sm text-muted-foreground">
            {stale
              ? "The app was updated while this tab was open. Reload to continue."
              : "This page hit a temporary problem. Your data is safe. Try again, and if it keeps happening, reload the page."}
          </p>
          {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {!stale && (
            <Button onClick={retry} disabled={pending}>
              <RefreshCw data-icon="inline-start" aria-hidden className={pending ? "animate-spin" : undefined} />
              {pending ? "Retrying…" : "Try again"}
            </Button>
          )}
          <Button variant={stale ? "default" : "outline"} onClick={() => window.location.reload()}>
            <RotateCw data-icon="inline-start" aria-hidden />
            Reload page
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/dashboard" />}>
            <House data-icon="inline-start" aria-hidden />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
