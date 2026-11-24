import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Equal,
  Minus,
  PiggyBank,
  Plus,
  Repeat,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { ActionLink, Eyebrow, SectionHeading } from "@/components/shared/apple-ui";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Shelf, ShelfItem } from "@/components/shared/shelf";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expenses Tracker · Know where your money goes",
};
export const dynamic = "force-dynamic";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The one filled button per viewport: Apple blue pill. */
const primaryCta = cn(
  "inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-base text-primary-foreground transition-colors duration-300 ease-(--ease-apple) hover:bg-primary/90 active:bg-primary/80",
  focusRing,
);

const SHORTCUTS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: ArrowDownLeft, label: "Income", href: "#essentials" },
  { icon: ArrowUpRight, label: "Expenses", href: "#essentials" },
  { icon: CalendarDays, label: "Calendar", href: "#essentials" },
  { icon: ChartColumn, label: "Analytics", href: "#essentials" },
  { icon: Target, label: "Budgets", href: "#essentials" },
  { icon: PiggyBank, label: "Savings", href: "#savings" },
];

const EQUATION: { label: string; hint: string; op?: LucideIcon; result?: boolean }[] = [
  { label: "Left from last month", hint: "Carried in for you." },
  { label: "Income", hint: "Salary, freelance, refunds.", op: Plus },
  { label: "Expenses", hint: "Everything you spent.", op: Minus },
  { label: "Money left", hint: "What you can still use.", op: Equal, result: true },
];

const tile = "flex h-full min-h-[24rem] flex-col rounded-2xl p-8 shadow-card tile-hover";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      {/* Global navigation */}
      <header className="sticky top-0 z-40 h-12 bg-background/80 backdrop-blur-xl backdrop-saturate-150 lg:h-11">
        <nav aria-label="Landing" className="mx-auto flex h-full max-w-[1024px] items-center justify-between gap-4 px-4 lg:px-5">
          <BrandLogo withText={false} size="sm" className={cn("rounded-full", focusRing)} />
          <ul className="flex items-center gap-1 text-xs sm:gap-6">
            {[
              { href: "#essentials", label: "Features" },
              { href: "#month", label: "How it works" },
              { href: "#savings", label: "Savings" },
            ].map((link) => (
              <li key={link.href} className="hidden sm:block">
                <a href={link.href} className={cn("rounded-full px-2 py-1 text-foreground/80 transition-colors hover:text-foreground active:opacity-60", focusRing)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href={user ? "/dashboard" : "/login"}
                className={cn("rounded-full px-2 py-1 text-foreground/80 transition-colors hover:text-foreground active:opacity-60", focusRing)}
                data-testid="nav-signin"
              >
                {user ? "Dashboard" : "Sign in"}
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* Ribbon */}
      <div className="bg-card px-4 py-4 text-center text-sm">
        Savings are kept completely separate from your income and expenses.{" "}
        <a href="#savings" className={cn("inline-flex items-center gap-0.5 rounded-full text-link hover:underline", focusRing)}>
          See how
          <ChevronRight className="size-3.5" aria-hidden />
        </a>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero: Apple-store header */}
        <section className="grid gap-8 pb-12 pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-12 md:pt-20 lg:pb-16">
          <h1 className="display-heading text-3xl md:text-5xl" data-testid="hero-title">
            Know where every rupee goes.
          </h1>
          <div className="md:text-right">
            <p className="font-heading text-2xl font-semibold text-balance">The simplest way to track your money. In rupees.</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
              <Link href={ctaHref} className={primaryCta} data-testid="cta-primary">
                {ctaLabel}
              </Link>
              <ActionLink href="#month">How it works</ActionLink>
            </div>
          </div>
        </section>

        {/* Shortcut row, like "Mac · iPhone · iPad" */}
        <nav aria-label="What's inside" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-4 lg:justify-between">
            {SHORTCUTS.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <a href={href} className={cn("group flex w-24 flex-col items-center gap-3 rounded-2xl py-2 text-center sm:w-28", focusRing)}>
                  <span className="flex size-20 items-center justify-center rounded-full bg-card text-ink shadow-card transition-[box-shadow,transform] duration-300 ease-(--ease-apple) group-hover:shadow-card-hover group-active:scale-95 dark:text-foreground sm:size-24">
                    <Icon className="size-8 sm:size-9" strokeWidth={1.25} aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* The essentials shelf */}
        <section id="essentials" aria-labelledby="essentials-title" className="scroll-mt-16 space-y-6 pt-16 md:pt-24">
          <SectionHeading id="essentials-title" title="The essentials." subtitle="Everything you need. Nothing you don't." />
          <Shelf label="Features">
            <ShelfItem className="w-[min(88vw,26rem)]">
              <div className={cn(tile, "bg-card")}>
                <Eyebrow>Built in</Eyebrow>
                <h4 className="mt-1 font-heading text-2xl font-semibold">Money left, explained.</h4>
                <p className="mt-3 text-sm text-muted-foreground">One number that tells you what you can still spend, with the sum written out underneath.</p>
                <div className="mt-auto rounded-2xl bg-background p-5" aria-label="Example">
                  <p className="text-xs text-muted-foreground">Example</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">₹23,510</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">₹88,566 carried + ₹62,023 income − ₹1,27,079 spent</p>
                </div>
              </div>
            </ShelfItem>
            <ShelfItem>
              <div className={cn(tile, "dark bg-ink text-foreground")}>
                <Eyebrow>Automatic</Eyebrow>
                <h4 className="mt-1 font-heading text-2xl font-semibold">Leftovers roll forward.</h4>
                <p className="mt-3 text-sm text-muted-foreground">Whatever you don&apos;t spend this month carries into the next one. No manual sums, ever.</p>
                <Repeat className="mt-auto size-16 text-muted-foreground" strokeWidth={1} aria-hidden />
              </div>
            </ShelfItem>
            <ShelfItem>
              <div className={cn(tile, "bg-card")}>
                <Eyebrow>Stay on track</Eyebrow>
                <h4 className="mt-1 font-heading text-2xl font-semibold">Budgets that warn you early.</h4>
                <p className="mt-3 text-sm text-muted-foreground">Set a limit per category and see what&apos;s left, with a daily allowance for the rest of the month.</p>
                <div className="mt-auto space-y-4" aria-label="Example">
                  {[
                    { name: "Food", pct: 45, bar: "bg-income" },
                    { name: "Shopping", pct: 86, bar: "bg-highlight" },
                  ].map((row) => (
                    <div key={row.name}>
                      <div className="flex justify-between text-sm">
                        <span>{row.name}</span>
                        <span className="text-muted-foreground tabular-nums">{row.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", row.bar)} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ShelfItem>
            <ShelfItem>
              <div className={cn(tile, "bg-card")}>
                <Eyebrow>See the pattern</Eyebrow>
                <h4 className="mt-1 font-heading text-2xl font-semibold">Calendar and analytics.</h4>
                <p className="mt-3 text-sm text-muted-foreground">Every day of the month at a glance, and trends over three, six or twelve months.</p>
                <ChartColumn className="mt-auto size-16 text-link" strokeWidth={1} aria-hidden />
              </div>
            </ShelfItem>
            <ShelfItem>
              <div className={cn(tile, "dark bg-ink text-foreground")}>
                <Eyebrow>Private</Eyebrow>
                <h4 className="mt-1 font-heading text-2xl font-semibold">Yours, and only yours.</h4>
                <p className="mt-3 text-sm text-muted-foreground">Sign in with e-mail and password. Export everything whenever you like.</p>
                <ShieldCheck className="mt-auto size-16 text-muted-foreground" strokeWidth={1} aria-hidden />
              </div>
            </ShelfItem>
          </Shelf>
        </section>

        {/* The maths */}
        <section id="month" aria-labelledby="month-title" className="scroll-mt-16 space-y-6 pt-16 md:pt-24">
          <SectionHeading id="month-title" title="One line of maths." subtitle="No guesswork." />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EQUATION.map(({ label, hint, op: Op, result }) => (
              <li key={label} className={cn("flex flex-col rounded-2xl p-6 shadow-card", result ? "dark bg-ink text-foreground" : "bg-card")}>
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
                  {Op ? <Op className="size-4" aria-hidden /> : <ArrowDownLeft className="size-4" aria-hidden />}
                </span>
                <span className="mt-6 font-heading text-xl font-semibold">{label}</span>
                <span className="mt-1 text-sm text-muted-foreground">{hint}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Savings */}
        <section id="savings" aria-labelledby="savings-title" className="scroll-mt-16 space-y-6 pt-16 md:pt-24">
          <SectionHeading id="savings-title" title="And savings?" subtitle="A space of their own." />
          <div className="grid gap-6 rounded-2xl bg-card p-8 shadow-card md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:p-10">
            <span className="flex size-20 items-center justify-center rounded-full bg-ice/50 text-link dark:bg-ice/15 dark:text-ice">
              <PiggyBank className="size-9" strokeWidth={1.25} aria-hidden />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold">A separate ledger, with its own balance, journal and goals.</p>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                Money you put aside is never added to, or taken from, your money left. Record what you saved and what you used it for, and keep a note of why.
              </p>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="start-title" className="py-16 md:py-24">
          <div className="rounded-3xl bg-card px-6 py-16 text-center shadow-card md:py-20">
            <h2 id="start-title" className="display-heading text-3xl md:text-5xl">
              Start today.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-heading text-xl font-semibold text-muted-foreground">Free, private and quick to set up.</p>
            <div className="mt-8">
              <Link href={ctaHref} className={primaryCta}>
                {ctaLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Expenses · Personal finance tracker in Indian rupees</span>
          <span>Your data stays yours.</span>
        </div>
      </footer>
    </div>
  );
}
