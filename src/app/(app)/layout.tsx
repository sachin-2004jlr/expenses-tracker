import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DatabaseUnavailable } from "@/components/shared/database-unavailable";
import { SetupRequired } from "@/components/shared/setup-required";
import { auth, authSetupError, getCurrentUser } from "@/lib/auth";
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
  const setupError = authSetupError();
  if (setupError) {
    return (
      <SetupRequired
        title="Sign-in is not configured"
        message={setupError}
        steps={["Run `npx auth secret` (or `openssl rand -base64 32`).", "Set AUTH_SECRET in your environment.", "Redeploy or restart the server."]}
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await safeLoadContext();
  if (!result.ok) {
    return <DatabaseUnavailable kind={result.kind} message={result.message} />;
  }
  const { context } = result;
  const user = await getCurrentUser();

  return (
    <AppShell categories={context.categories} tagSuggestions={context.tagNames} today={context.today} currentMonth={context.currentMonth} user={user}>
      {children}
    </AppShell>
  );
}
