"use client";

import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the whole document,
 * so it renders its own <html> and uses plain elements (no app providers are available).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN" className="dark">
      <body className="flex min-h-svh items-center justify-center bg-background px-4 font-sans text-foreground">
        <main className="max-w-md text-center" role="alert">
          <h1 className="text-lg font-semibold">Expenses Tracker could not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">A temporary problem stopped the app from starting. Your data is safe. Reload to try again.</p>
          {error.digest && <p className="mt-1 text-xs text-muted-foreground">Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
