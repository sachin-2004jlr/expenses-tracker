import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { signInWithGoogleAction } from "@/features/auth/actions";
import { allowedEmails, auth, isAuthConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "This Google account is not on the allowed list for this tracker.",
  OAuthAccountNotLinked: "This e-mail is already linked to a different sign-in method.",
  Configuration: "Sign-in is misconfigured on the server. Check AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.",
  Default: "Sign-in failed. Please try again.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.5 2.3 11.8S6.6 21.4 12 21.4c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.7H12z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const configured = isAuthConfigured();
  if (configured) {
    const session = await auth();
    if (session?.user?.id) redirect("/dashboard");
  }
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default) : null;
  const restricted = allowedEmails().length > 0;

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
          <p className="mt-3 text-sm text-muted-foreground">
            Your transactions stay in your own database. Sign-in only identifies you.
          </p>

          {errorMessage && (
            <p role="alert" className="mt-5 flex gap-2 rounded-xl border border-expense/30 bg-expense/10 p-3 text-sm text-expense-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {errorMessage}
            </p>
          )}

          {configured ? (
            <form action={signInWithGoogleAction.bind(null, "/dashboard")} className="mt-6">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.99]"
              >
                <GoogleMark />
                Continue with Google
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {restricted ? "Only approved Google accounts can sign in." : "Any Google account gets its own private workspace."}
              </p>
            </form>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-border bg-card-elevated p-3 text-sm text-muted-foreground">
                Google sign-in is not configured yet, so the app runs in <span className="font-medium text-foreground">local single-user mode</span>. Add
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">AUTH_SECRET</code>,
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">AUTH_GOOGLE_ID</code> and
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">AUTH_GOOGLE_SECRET</code> to <code className="font-mono text-xs">.env</code> to enable it.
              </div>
              <Link
                href="/dashboard"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-glow-brand transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          )}

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-income" aria-hidden />
            Private by design: AI runs on your machine through Ollama.
          </p>
        </div>
      </main>
    </div>
  );
}
