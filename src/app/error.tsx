"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

/** Catches errors on the landing, login and register pages (outside the app shell). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} fullPage />;
}
