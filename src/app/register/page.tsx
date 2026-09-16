import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SetupRequired } from "@/components/shared/setup-required";
import { RegisterForm } from "@/features/auth/register-form";
import { allowedEmails, auth, authSetupError } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const setupError = authSetupError();
  if (setupError) {
    return <SetupRequired title="Sign-in is not configured" message={setupError} steps={["Run `npx auth secret` (or `openssl rand -base64 32`).", "Set AUTH_SECRET in your environment.", "Redeploy or restart the server."]} />;
  }
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const restricted = allowedEmails().length > 0;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center px-6">
        <BrandLogo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/30 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Get started</p>
          <h1 className="display-heading mt-2 text-[2rem] text-foreground sm:text-4xl">
            Create your
            <br />
            account
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {restricted ? "Registration is limited to approved e-mail addresses." : "Free, private, and yours. You can export everything at any time."}
          </p>
          <RegisterForm />
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-income" aria-hidden />
            Passwords are hashed with scrypt and never stored in plain text.
          </p>
        </div>
      </main>
    </div>
  );
}
