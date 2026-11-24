import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Equal, Minus, MoveDown, PiggyBank, Plus, Repeat, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ChromeArcs } from "@/components/ui/chrome-arcs";
import { RupeeRoll3D } from "@/features/landing/rupee-roll-3d";
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
  tracker: "bg-ink text-canvas dark:bg-canvas dark:text-ink",
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

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="min-h-svh overflow-x-clip bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-foreground">
      {/* Hero: black chrome arcs behind everything; `dark` switches the tokens to the dark set. */}
      <ChromeArcs className="dark h-auto text-foreground" label="Chrome arcs">
        <div className="relative w-full">
          {/* Legibility: darker behind the words, the arcs stay bright where there is no text. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.72)_0%,rgb(0_0_0/0.58)_55%,rgb(0_0_0/0.78)_100%)] lg:bg-[linear-gradient(90deg,rgb(0_0_0/0.78)_0%,rgb(0_0_0/0.42)_48%,rgb(0_0_0/0.12)_100%)]"
          />
          <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col px-5 pb-16 sm:px-8 lg:pb-20 short:min-h-0 short:pb-10">
            <header className="flex h-20 items-center justify-between short:h-14">
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
                  className={cn(
                    "ml-1 inline-flex h-10 items-center rounded-full bg-canvas/10 px-4 text-sm text-foreground backdrop-blur transition-colors hover:bg-canvas/20 active:bg-canvas/25",
                    focusRing,
                  )}
                  data-testid="nav-signin"
                >
                  {user ? "Dashboard" : "Sign in"}
                </Link>
              </nav>
            </header>

            <div className="grid flex-1 items-center gap-10 pt-[4vh] sm:pt-[7vh] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12 lg:pt-0 short:pt-2">
              <div className="max-w-2xl">
                <p className="text-base font-semibold text-silver">Personal finance, in rupees</p>
                <h1 className="display-heading mt-3 text-3xl md:text-5xl short:text-2xl" data-testid="hero-title">
                  Know where <span className="chrome-text">every rupee</span> goes.
                </h1>
                <p className="mt-6 max-w-md text-base text-muted-foreground short:mt-3">
                  A calm, private money tracker. Log what comes in and goes out, and watch what&apos;s left roll into next month. Savings get a space of their own.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 short:mt-4">
                  <Link href={ctaHref} className={primaryCta} data-testid="cta-primary">
                    {ctaLabel}
                  </Link>
                  <a href="#how" className={textLink}>
                    How it works
                    <ChevronRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>

              {/* Right side: the rolled ₹500 note, cut out of its photo and turning in 3D. */}
              <div className="flex justify-center lg:justify-end lg:pr-12">
                <RupeeRoll3D />
              </div>
            </div>
          </div>
        </div>
      </ChromeArcs>

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
                  <li key={term.label} className={cn("rounded-2xl p-6", term.result ? "bg-ink text-canvas" : "bg-background text-foreground")}>
                    <span
                      className={cn("mb-5 flex size-9 items-center justify-center rounded-full", term.result ? "bg-canvas text-ink" : "bg-card text-foreground shadow-card")}
                      aria-hidden
                    >
                      <Op className="size-4" />
                    </span>
                    <p className="text-base font-semibold">{term.label}</p>
                    <p className={cn("mt-1 text-sm", term.result ? "text-silver" : "text-muted-foreground")}>{term.hint}</p>
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

        {/* Final call to action, on the same chrome arcs */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <ChromeArcs className="dark h-auto rounded-3xl text-foreground" speed={0.6} label="Chrome arcs">
            <div className="relative w-full">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_50%,rgb(0_0_0/0.7)_20%,transparent)]" />
              <div className="relative px-6 py-20 text-center sm:px-10 lg:py-28">
                <h2 className="display-heading text-3xl md:text-5xl">
                  Start tracking <span className="chrome-text">today.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">Free, private and quick to set up. Your first entry takes less than a minute.</p>
                <div className="mt-9">
                  <Link href={ctaHref} className={primaryCta}>
                    {ctaLabel}
                  </Link>
                </div>
              </div>
            </div>
          </ChromeArcs>
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
