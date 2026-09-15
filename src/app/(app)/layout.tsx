import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DatabaseUnavailable } from "@/components/shared/database-unavailable";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { loadAppContext, type AppContext } from "@/lib/services/bootstrap";

// Every page reads live financial data; never prerender at build time.
export const dynamic = "force-dynamic";

type LoadResult = { ok: true; context: AppContext } | { ok: false; kind: "not-configured" | "connection-failed"; message: string };

async function safeLoadContext(): Promise<LoadResult> {
  try {
    return { ok: true, context: await loadAppContext() };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return { ok: false, kind: error.kind, message: error.message };
    throw error;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await safeLoadContext();
  if (!result.ok) {
    return <DatabaseUnavailable kind={result.kind} message={result.message} />;
  }
  const { context } = result;
  return (
    <AppShell categories={context.categories} tagSuggestions={context.tagNames} today={context.today}>
      {children}
    </AppShell>
  );
}
