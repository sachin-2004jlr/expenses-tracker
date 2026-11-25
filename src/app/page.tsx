import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Equal,
  IndianRupee,
  Lock,
  Minus,
  NotebookPen,
  PiggyBank,
  Plus,
  Repeat,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ChromeArcs } from "@/components/ui/chrome-arcs";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expenses Tracker · Know where your money goes",
};
export const dynamic = "force-dynamic";

/*
 * The landing page is one dark, monochrome piece that matches its two images: black chrome arcs
 * and a black-and-white ₹500 note. White and silver type, frosted glass cards, and a single cool
 * ice-blue accent taken from the light in the arcs.
 */

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Wallet, title: "Every rupee, month by month", text: "Add income and expenses in seconds. Each month shows exactly what came in and what went out." },
  { icon: Repeat, title: "Leftovers roll forward", text: "Whatever you don't spend this month carries into the next one. No manual sums, ever." },
  { icon: Target, title: "Budgets that warn early", text: "Give a category a limit and see what's left, with a daily allowance for the rest of the month." },
  { icon: ChartColumn, title: "Calendar and analytics", text: "Every day of the month at a glance, and trends over three, six or twelve months." },
];

const TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: IndianRupee, label: "Made for rupees" },
  { icon: Lock, label: "Private, your own data" },
  { icon: PiggyBank, label: "Savings kept separate" },
];

const EQUATION: { label: string; hint: string; icon: LucideIcon; result?: boolean }[] = [
  { label: "Left from last month", hint: "Carried in for you", icon: ArrowDownLeft },
  { label: "Income", hint: "Salary, freelance, refunds", icon: Plus },
  { label: "Expenses", hint: "Everything you spent", icon: Minus },
  { label: "Money left", hint: "What you can still use", icon: Equal, result: true },
];

const PREVIEW_ROWS: { name: string; meta: string; amount: string; income?: boolean }[] = [
  { name: "Salary", meta: "Salary · 1 Nov", amount: "+ ₹55,000", income: true },
  { name: "Rent", meta: "Rent · 2 Nov", amount: "− ₹18,000" },
  { name: "Groceries", meta: "Groceries · 5 Nov", amount: "− ₹2,340" },
];

const SAVINGS_POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: PiggyBank, title: "Its own balance", text: "What you added and what you used." },
  { icon: NotebookPen, title: "A journal", text: "Note what you did with the money, and why." },
  { icon: CalendarDays, title: "Goals", text: "See how much to set aside each month." },
];

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ice focus-visible:ring-offset-2 focus-visible:ring-offset-black";

/** The one filled button per screen: a white pill, like the note itself. */
const primaryCta = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-black shadow-[0_0_0_1px_rgb(255_255_255/0.2),0_10px_30px_-10px_rgb(173_216_255/0.55)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-white/90 hover:shadow-[0_0_0_1px_rgb(255_255_255/0.3),0_14px_36px_-10px_rgb(173_216_255/0.75)] active:scale-[0.97]",
  focusRing,
);

const textLink = cn("inline-flex min-h-11 items-center gap-1 rounded-full text-base font-medium text-white/80 transition-colors hover:text-white", focusRing);

/** Frosted glass on black. */
const glass = "rounded-3xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md";

function SectionTitle({ eyebrow, title, muted, id }: { eyebrow: string; title: string; muted: string; id: string }) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ice">
        <span className="h-px w-6 bg-ice/70" aria-hidden />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-4 text-4xl text-balance text-white sm:text-5xl">
        {title} <span className="text-white/45">{muted}</span>
      </h2>
    </div>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="dark min-h-svh overflow-x-clip bg-black pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-white">
      {/* ------------------------------------------------------------------ hero */}
      <ChromeArcs className="h-auto" label="Chrome arcs">
        <div className="relative w-full">
          {/* Legibility: darker behind the words; the arcs stay bright where there is no text. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.72)_0%,rgb(0_0_0/0.5)_45%,rgb(0_0_0/0.85)_100%)] lg:bg-[linear-gradient(90deg,rgb(0_0_0/0.82)_0%,rgb(0_0_0/0.45)_50%,rgb(0_0_0/0.2)_100%)]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black" />

          <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col px-5 pb-10 sm:px-8 lg:pb-14 short:min-h-0 short:pb-8">
            <header className="flex h-20 items-center justify-between short:h-14">
              <BrandLogo className={cn("rounded-full", focusRing)} />
              <nav aria-label="Landing" className="flex items-center gap-1 text-sm sm:gap-2">
                <a href="#features" className={cn("hidden rounded-full px-3 py-2 text-white/65 transition-colors hover:text-white sm:inline", focusRing)}>
                  Features
                </a>
                <a href="#how" className={cn("hidden rounded-full px-3 py-2 text-white/65 transition-colors hover:text-white sm:inline", focusRing)}>
                  How it works
                </a>
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className={cn(
                    "ml-1 inline-flex h-10 items-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/[0.12]",
                    focusRing,
                  )}
                  data-testid="nav-signin"
                >
                  {user ? "Dashboard" : "Sign in"}
                </Link>
              </nav>
            </header>

            <div className="grid flex-1 items-center gap-10 pt-6 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8 lg:pt-0 short:gap-6 short:pt-2">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
                  <span className="size-1.5 rounded-full bg-ice shadow-[0_0_10px_var(--palette-ice)]" aria-hidden />
                  Personal finance, in rupees
                </p>
                <h1
                  className="display-heading mt-5 text-[3.4rem] text-balance sm:text-7xl lg:text-[5.75rem] xl:text-[6.5rem] short:mt-3 short:text-5xl"
                  data-testid="hero-title"
                >
                  Know where <span className="chrome-text">every rupee</span> goes.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-white/70 sm:text-lg short:mt-3 short:text-base">
                  A calm, private money tracker. Log what comes in and goes out, and watch what&apos;s left roll into next month. Savings get a space of their own.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 short:mt-5 short:flex-row short:items-center">
                  <Link href={ctaHref} className={cn(primaryCta, "w-full sm:w-auto short:w-auto")} data-testid="cta-primary">
                    {ctaLabel}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <a href="#how" className={cn(textLink, "justify-center sm:justify-start")}>
                    See how it works
                    <ChevronRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>

              {/* The note: lying flat on the right, under the words on phones. */}
              <div className="relative flex justify-center lg:justify-end">
                <div aria-hidden className="pointer-events-none absolute inset-x-[10%] bottom-[8%] top-[20%] rounded-full bg-ice/15 blur-3xl" />
                <Image
                  src="/landing/crumpled-500.webp"
                  alt="A crumpled ₹500 note"
                  width={1672}
                  height={941}
                  sizes="(min-width: 1280px) 42rem, (min-width: 1024px) 52vw, (min-width: 640px) 36rem, 100vw"
                  fetchPriority="high"
                  className="relative h-auto w-full max-w-xl -rotate-3 drop-shadow-[0_30px_40px_rgb(0_0_0/0.7)] lg:max-w-[42rem] short:w-auto short:max-h-52"
                />
              </div>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-3 lg:mt-12 short:mt-6" aria-label="At a glance">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className={cn(glass, "flex items-center gap-3 rounded-2xl px-4 py-3")}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-white/85">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ChromeArcs>

      <main>
        {/* -------------------------------------------------------------- features */}
        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 sm:px-8 lg:py-28">
          <SectionTitle id="features-title" eyebrow="Features" title="Simple by design." muted="Built to use every day." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className={cn(glass, "p-6 transition-[border-color,background-color] duration-300 hover:border-white/20 hover:bg-white/[0.06] sm:p-7")}>
                <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/15 to-white/5 text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-6 text-2xl text-balance text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-white/60">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------- how it works */}
        <section id="how" aria-labelledby="how-title" className="relative scroll-mt-6 border-y border-white/10 bg-[radial-gradient(60%_80%_at_80%_20%,rgb(173_216_255/0.08),transparent_70%)]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <SectionTitle id="how-title" eyebrow="How it works" title="One line of maths." muted="No guesswork." />
              <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-white/60">
                Your dashboard works out the money you have left the same way every time, and shows you the sum.
              </p>
              <ol className="mt-10 space-y-3" aria-label="How money left is worked out">
                {EQUATION.map(({ label, hint, icon: Icon, result }) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border px-4 py-3.5",
                      result ? "border-white/25 bg-white text-black" : "border-white/10 bg-white/[0.03] text-white",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", result ? "bg-black text-white" : "bg-white/10 text-white")}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{label}</span>
                      <span className={cn("block text-sm", result ? "text-black/60" : "text-white/55")}>{hint}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* A still example of the dashboard's first card. */}
            <figure aria-label="Example of the money left card" className={cn(glass, "relative p-6 sm:p-8")}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white/60">Money left · November</p>
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">Example</span>
              </div>
              <p className="mt-3 font-heading text-6xl tabular-nums chrome-text sm:text-7xl">₹23,510</p>
              <p className="mt-3 text-sm text-pretty text-white/50 tabular-nums">₹88,566 carried + ₹62,023 income − ₹1,27,079 spent</p>
              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-white/60 to-ice" />
              </div>
              <p className="mt-2 text-xs text-white/45">Spent 84% of the money you had</p>
              <ul className="mt-6 divide-y divide-white/10">
                {PREVIEW_ROWS.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{row.name}</span>
                      <span className="block truncate text-xs text-white/45">{row.meta}</span>
                    </span>
                    <span className={cn("shrink-0 text-sm font-semibold tabular-nums", row.income ? "text-ice" : "text-white")}>{row.amount}</span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </section>

        {/* --------------------------------------------------------------- savings */}
        <section id="savings" aria-labelledby="savings-title" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 sm:px-8 lg:py-28">
          <div className={cn(glass, "relative overflow-hidden p-6 sm:p-10 lg:p-14")}>
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-ice/15 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
              <div>
                <SectionTitle id="savings-title" eyebrow="Savings" title="And savings?" muted="A space of their own." />
                <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-white/60">
                  Money you put aside lives in its own ledger. It is never added to, or taken from, your money left.
                </p>
              </div>
              <ul className="grid gap-3" aria-label="What Savings includes">
                {SAVINGS_POINTS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ice/15 text-ice">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold text-white">{title}</span>
                      <span className="block text-sm text-white/55">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- final call to action */}
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
          <ChromeArcs className="h-auto rounded-3xl border border-white/10" speed={0.6} label="Chrome arcs">
            <div className="relative w-full">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_75%_at_50%_50%,rgb(0_0_0/0.78)_20%,transparent)]" />
              <div className="relative px-6 py-16 text-center sm:px-10 sm:py-20 lg:py-28">
                <h2 className="display-heading text-5xl text-balance sm:text-6xl lg:text-7xl">
                  Start tracking <span className="chrome-text">today.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-md text-base text-pretty text-white/70">Free, private and quick to set up. Your first entry takes less than a minute.</p>
                <div className="mt-9">
                  <Link href={ctaHref} className={primaryCta}>
                    {ctaLabel}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </ChromeArcs>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-white/45 sm:flex-row sm:px-8">
          <BrandLogo size="sm" className={cn("rounded-full", focusRing)} />
          <p>Personal finance tracker · Indian rupee · Your own data</p>
        </div>
      </footer>
    </div>
  );
}
