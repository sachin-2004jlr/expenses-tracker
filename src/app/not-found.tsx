import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-4 text-center text-foreground">
      <BrandLogo />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">404</p>
        <h1 className="display-heading mt-2 text-4xl">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">That link does not exist. Your dashboard is one click away.</p>
      </div>
      <Link href="/dashboard" className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">
        Open dashboard
      </Link>
    </main>
  );
}
