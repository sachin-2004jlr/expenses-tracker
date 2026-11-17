import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowRight, Equal, Minus, PiggyBank, Plus, Repeat, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { FallingNotes } from "@/features/landing/falling-notes";
import styles from "@/features/landing/landing.module.css";
import { NoteSymbols } from "@/features/landing/note-art";
import { ParallaxHero } from "@/features/landing/parallax-hero";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expenses Tracker · Know where your money goes",
};
export const dynamic = "force-dynamic";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Wallet,
    title: "Every rupee, month by month",
    text: "Log income and expenses in a few seconds. Each month gets its own clear picture of what came in and what went out.",
  },
  {
    icon: Repeat,
    title: "Leftover rolls forward",
    text: "Whatever you don't spend this month carries into the next one on its own. No manual carrying, no surprises.",
  },
  {
    icon: PiggyBank,
    title: "Savings stay separate",
    text: "Savings live in a space of their own, with their own balance, journal and goals. They never mix with your monthly money.",
  },
  {
    icon: ShieldCheck,
    title: "Private and yours",
    text: "An e-mail and password account on your own database. Export everything as JSON or CSV whenever you like.",
  },
];

const EQUATION: { label: string; hint: string; op?: LucideIcon; highlight?: boolean }[] = [
  { label: "Left from last month", hint: "carried in automatically" },
  { label: "Income", hint: "salary, freelance, refunds", op: Plus },
  { label: "Expenses", hint: "everything you spent", op: Minus },
  { label: "Money in hand", hint: "what you can still use", op: Equal, highlight: true },
];

const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

const primaryCta =
  "inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-xs font-extrabold uppercase tracking-[0.15em] text-brand-foreground shadow-glow-brand transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className={cn("dark min-h-svh overflow-x-clip text-foreground", styles.page)}>
      <NoteSymbols />

      <ParallaxHero className={styles.hero}>
        <FallingNotes scene="hero" className={styles.heroZone} />

        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-7xl flex-col px-5 sm:px-8">
          <header className={cn("flex h-20 items-center justify-between", styles.fadeUp)}>
            <BrandLogo />
            <nav aria-label="Landing" className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="#how" className="hidden transition-colors hover:text-foreground sm:inline">
                How it works
              </a>
              <a href="#month" className="hidden transition-colors hover:text-foreground sm:inline">
                Your month
              </a>
              <Link
                href={user ? "/dashboard" : "/login"}
                className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-brand/60 hover:text-brand"
                data-testid="nav-signin"
              >
                {user ? "Dashboard" : "Sign in"}
              </Link>
            </nav>
          </header>

          <div className={cn("max-w-xl pt-[7vh] sm:pt-[9vh] lg:max-w-3xl lg:pt-[11vh]", styles.heroCopy)}>
            <p className={cn("flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand", styles.fadeUp)} style={delay(0.1)}>
              <span className="h-px w-8 bg-brand" aria-hidden />
              Personal finance · ₹
            </p>
            <h1 className="display-heading mt-5 text-[clamp(2.6rem,12.5vw,4rem)] text-foreground sm:text-7xl lg:text-[4.5rem] xl:text-[5.25rem]" data-testid="hero-title">
              <span className={styles.line}>
                <span className={styles.lineInner} style={delay(0.15)}>
                  Know where{" "}
                </span>
              </span>
              <span className={styles.line}>
                <span className={cn(styles.lineInner, styles.accent)} style={delay(0.27)}>
                  every rupee{" "}
                </span>
              </span>
              <span className={styles.line}>
                <span className={styles.lineInner} style={delay(0.39)}>
                  goes.
                </span>
              </span>
            </h1>
            <p className={cn("mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-base", styles.fadeUp)} style={delay(0.55)}>
              A calm, private money tracker. Log what comes in and goes out, watch your leftover roll into next month, and keep savings in a space of their own.
            </p>
            <div className={cn("mt-8 flex flex-wrap items-center gap-3", styles.fadeUp)} style={delay(0.7)}>
              <Link href={ctaHref} className={primaryCta} data-testid="cta-primary">
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-black/40 px-6 text-xs font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
              >
                How it works
              </a>
            </div>
          </div>

          <a
            href="#how"
            className={cn("relative z-10 mb-8 mt-auto hidden w-fit items-center gap-3 pt-10 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50 hover:text-white lg:flex", styles.fadeUp)}
            style={delay(1)}
          >
            <span className={styles.cue} aria-hidden />
            Scroll
          </a>
        </div>

        <div className={styles.heroFade} aria-hidden />
      </ParallaxHero>

      <main>
        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 sm:px-8 lg:py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand">How it works</p>
          <h2 className="display-heading mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">Simple enough to use every day</h2>
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className={styles.reveal}>
                  <span className={styles.rule} aria-hidden />
                  <div className="mt-6 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-white/35">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold leading-snug">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{feature.text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* The month, explained */}
        <section id="month" className="scroll-mt-6 border-y border-white/8 bg-[#080808]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand">Your month</p>
            <h2 className="display-heading mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">One line of math. No guesswork.</h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              The dashboard shows how much money you have in hand, worked out the same way every time.
            </p>

            <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How money in hand is worked out">
              {EQUATION.map((term) => {
                const Op = term.op ?? ArrowDown;
                return (
                  <li
                    key={term.label}
                    className={cn(
                      "relative rounded-2xl border p-5",
                      term.highlight ? "border-brand/50 bg-brand/10 shadow-glow-brand" : "border-white/10 bg-white/[0.03]",
                      styles.reveal,
                    )}
                  >
                    <span
                      className={cn(
                        "mb-4 flex size-8 items-center justify-center rounded-full",
                        term.highlight ? "bg-brand text-brand-foreground" : "bg-white/8 text-white/70",
                      )}
                      aria-hidden
                    >
                      <Op className="size-4" />
                    </span>
                    <p className={cn("text-lg font-bold", term.highlight && "text-brand")}>{term.label}</p>
                    <p className="mt-1 text-xs text-white/50">{term.hint}</p>
                  </li>
                );
              })}
            </ol>

            <div className={cn("mt-6 flex items-start gap-4 rounded-2xl border border-dashed border-white/12 p-5", styles.reveal)}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-300">
                <PiggyBank className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">And savings?</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  They are not part of this math at all. Savings have their own page, their own balance, a journal and goals, so your monthly numbers only ever show your monthly money.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-clip">
          <FallingNotes scene="cta" className="opacity-60" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_50%,#040404_30%,transparent)]" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-5 py-28 text-center sm:px-8 lg:py-36">
            <h2 className={cn("display-heading text-5xl sm:text-6xl lg:text-7xl", styles.reveal)}>
              Start tracking <span className={styles.accent}>today</span>
            </h2>
            <p className={cn("mx-auto mt-5 max-w-md text-sm text-white/60 sm:text-base", styles.reveal)}>Free, private and quick to set up. Your first entry takes less than a minute.</p>
            <div className={cn("mt-9", styles.reveal)}>
              <Link href={ctaHref} className={primaryCta}>
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-white/45 sm:flex-row sm:px-8">
          <BrandLogo size="sm" />
          <p>Personal finance tracker · Indian Rupee · Your own data</p>
        </div>
      </footer>
    </div>
  );
}
