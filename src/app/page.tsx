import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Equal, Minus, MoveDown, PiggyBank, Plus, Repeat, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expenses Tracker · Know where your money goes",
};
export const dynamic = "force-dynamic";

type Tone = "tracker" | "savings" | "neutral";

const FEATURES: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
  {
    icon: Wallet,
    tone: "tracker",
    title: "Every rupee, month by month.",
    text: "Add income and expenses in seconds. Each month shows exactly what came in and what went out.",
  },
  {
    icon: Repeat,
    tone: "tracker",
    title: "Leftovers roll forward.",
    text: "Whatever you don't spend this month carries into the next one automatically. No manual sums.",
  },
  {
    icon: PiggyBank,
    tone: "savings",
    title: "Savings stay separate.",
    text: "Savings get their own balance, journal and goals. They're never added to or taken from your monthly money.",
  },
  {
    icon: ShieldCheck,
    tone: "neutral",
    title: "Private and yours.",
    text: "Sign in with e-mail and password, keep your data in your own database and export it any time.",
  },
];

const TONE_CHIP: Record<Tone, string> = {
  tracker: "bg-flame/15 text-ember dark:text-flame",
  savings: "bg-ice/60 text-link dark:bg-ice/15 dark:text-ice",
  neutral: "bg-mist text-ink dark:bg-muted dark:text-foreground",
};

const EQUATION: { label: string; hint: string; op?: LucideIcon; result?: boolean }[] = [
  { label: "Left from last month", hint: "Carried in automatically." },
  { label: "Income", hint: "Salary, freelance, refunds.", op: Plus },
  { label: "Expenses", hint: "Everything you spent.", op: Minus },
  { label: "Money left", hint: "What you can still use.", op: Equal, result: true },
];

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The one filled button per viewport: Apple blue pill. */
const primaryCta = cn(
  "inline-flex h-11 items-center justify-center rounded-full bg-link px-6 text-base font-normal text-white transition-colors duration-300 ease-(--ease-apple) hover:bg-link/90 active:bg-link/80",
  focusRing,
);

/** Secondary actions are text links with a chevron, never a second filled button. */
const textLink = cn("inline-flex items-center gap-0.5 rounded-full text-base text-primary transition-opacity hover:underline active:opacity-70", focusRing);

/** Orange headline words on ink (flame on ink is well above 3:1 for large text). */
const accent =
  "bg-[linear-gradient(100deg,color-mix(in_srgb,var(--palette-flame)_55%,var(--palette-canvas))_0%,var(--palette-flame)_60%)] bg-clip-text text-transparent";

/** Soft flame glow under an ink surface. */
const inkGlow = "bg-ink bg-[radial-gradient(90%_60%_at_70%_100%,color-mix(in_srgb,var(--palette-flame)_12%,transparent),transparent_70%)]";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      {/* The hero is always ink, whatever the theme: `dark` switches its tokens to the dark set. */}
      <section className={cn("dark relative isolate text-foreground", inkGlow)}>
        <div className="mx-auto flex max-w-7xl flex-col px-5 pb-20 sm:px-8 lg:pb-28">
          <header className="flex h-20 items-center justify-between">
            <BrandLogo className={cn("rounded-full", focusRing)} />
            <nav aria-label="Landing" className="flex items-center gap-1 text-sm sm:gap-2">
              <a
                href="#how"
                className={cn("hidden rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground active:opacity-70 sm:inline", focusRing)}
              >
                How it works
              </a>
              <a
                href="#month"
                className={cn("hidden rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground active:opacity-70 sm:inline", focusRing)}
              >
                Your month
              </a>
              <Link
                href={user ? "/dashboard" : "/login"}
                className={cn("ml-1 rounded-full bg-canvas/10 px-4 py-1.5 text-sm text-foreground transition-colors hover:bg-canvas/20 active:bg-canvas/25", focusRing)}
                data-testid="nav-signin"
              >
                {user ? "Dashboard" : "Sign in"}
              </Link>
            </nav>
          </header>

          <div className="grid items-center gap-12 pt-[6vh] sm:pt-[9vh] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:pt-[10vh]">
            <div className="max-w-2xl">
              <p className="text-base font-semibold text-flame">Personal finance, in rupees</p>
              <h1 className="display-heading mt-3 text-3xl md:text-5xl" data-testid="hero-title">
                Know where <span className={accent}>every rupee</span> goes.
              </h1>
              <p className="mt-6 max-w-md text-base text-muted-foreground">
                A calm, private money tracker. Log what comes in and goes out, and watch what&apos;s left roll into next month. Savings get a space of their own.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href={ctaHref} className={primaryCta} data-testid="cta-primary">
                  {ctaLabel}
                </Link>
                <a href="#how" className={textLink}>
                  How it works
                  <ChevronRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>

            {/* A still example of the dashboard's first card. */}
            <figure aria-label="Example of the money left card" className="w-full max-w-md justify-self-center rounded-3xl bg-card p-7 shadow-card lg:justify-self-end">
              <p className="text-xs text-muted-foreground">Example</p>
              <p className="mt-1 text-base font-semibold">
                Money left. <span className="text-muted-foreground">November so far.</span>
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">₹23,510</p>
              <p className="mt-2 text-sm text-muted-foreground tabular-nums">₹88,566 carried + ₹62,023 income − ₹1,27,079 spent</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[84%] rounded-full bg-highlight" />
              </div>
              <ul className="mt-5 grid grid-cols-3 gap-2 text-xs">
                {[
                  ["Income", "₹62,023"],
                  ["Spent", "₹1,27,079"],
                  ["Per day", "₹7,475"],
                ].map(([label, value]) => (
                  <li key={label} className="rounded-2xl bg-background p-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="mt-1 block truncate text-sm font-semibold tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </div>
      </section>

      <main>
        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="max-w-3xl text-2xl font-semibold md:text-3xl">
            Simple by design. <span className="text-muted-foreground">Built to use every day.</span>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="rounded-2xl bg-card p-7 shadow-card">
                  <span className={cn("flex size-11 items-center justify-center rounded-full", TONE_CHIP[feature.tone])}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* The month, explained */}
        <section id="month" className="scroll-mt-6 bg-card">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className="max-w-3xl text-2xl font-semibold md:text-3xl">
              One line of maths. <span className="text-muted-foreground">No guesswork.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">Your dashboard works out the money you have left the same way every time.</p>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="How money left is worked out">
              {EQUATION.map((term) => {
                const Op = term.op ?? MoveDown;
                return (
                  <li key={term.label} className={cn("rounded-2xl p-6", term.result ? "bg-flame text-ink" : "bg-background text-foreground")}>
                    <span
                      className={cn("mb-5 flex size-9 items-center justify-center rounded-full", term.result ? "bg-ink text-flame" : "bg-card text-foreground shadow-card")}
                      aria-hidden
                    >
                      <Op className="size-4" />
                    </span>
                    <p className="text-base font-semibold">{term.label}</p>
                    <p className={cn("mt-1 text-sm", term.result ? "text-ink" : "text-muted-foreground")}>{term.hint}</p>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex items-start gap-4 rounded-2xl bg-background p-6">
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", TONE_CHIP.savings)}>
                <PiggyBank className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-base font-semibold">And savings?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  They&apos;re not part of this sum. Savings are a separate ledger with their own balance, journal and goals, so nothing you save is ever added to or
                  taken from your money left.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className={cn("dark relative isolate overflow-clip rounded-3xl text-foreground", inkGlow)}>
            <div className="relative px-6 py-20 text-center sm:px-10 lg:py-28">
              <h2 className="display-heading text-3xl md:text-5xl">
                Start tracking <span className={accent}>today.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">Free, private and quick to set up. Your first entry takes less than a minute.</p>
              <div className="mt-9">
                <Link href={ctaHref} className={primaryCta}>
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <BrandLogo size="sm" className={cn("rounded-full", focusRing)} />
          <p>Personal finance tracker · Indian rupee · Your own data</p>
        </div>
      </footer>
    </div>
  );
}
