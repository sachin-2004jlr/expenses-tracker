import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SetupRequired } from "@/components/shared/setup-required";
import { LoginForm } from "@/features/auth/login-form";
import { auth, authSetupError } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const setupError = authSetupError();
  if (setupError) {
    return <SetupRequired title="Sign-in is not configured" message={setupError} steps={["Run `npx auth secret` (or `openssl rand -base64 32`).", "Set AUTH_SECRET in your environment (Vercel: Project → Settings → Environment Variables).", "Redeploy or restart the server."]} />;
  }
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const next = safeRedirectPath(Array.isArray(params.next) ? params.next[0] : params.next);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center px-6">
        <BrandLogo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/30">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Welcome back</p>
          <h1 className="display-heading mt-2 text-4xl text-foreground">
            Sign in to
            <br />
            your money
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Your transactions stay in your own database. Sign-in only identifies you.</p>
          <LoginForm next={next} />
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-income" aria-hidden />
            Private by design: AI runs on your machine through Ollama.
          </p>
        </div>
      </main>
    </div>
  );
}
