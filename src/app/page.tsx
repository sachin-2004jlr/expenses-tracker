import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  ChartColumn,
  Download,
  Lock,
  Repeat,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ExpenseCard } from "@/features/dashboard/expense-card";
import { IncomeCard } from "@/features/dashboard/income-card";
import { MonthlyBars } from "@/features/dashboard/monthly-bars";
import { SavingsGauge } from "@/features/dashboard/savings-gauge";
import { TopCategoryCard } from "@/features/dashboard/top-category-card";
import { getCurrentUser, isAuthConfigured } from "@/lib/auth";
import type { MonthTotals } from "@/types";

export const metadata: Metadata = {
  title: "Expenses Tracker · Know where your money goes",
};
export const dynamic = "force-dynamic";

const SAMPLE_SERIES: MonthTotals[] = [
  { month: "2026-04", income: 5_200_000, expenses: 2_310_000, savings: 2_890_000, savingsRate: 55.6, transactionCount: 41 },
  { month: "2026-05", income: 5_200_000, expenses: 1_980_000, savings: 3_220_000, savingsRate: 61.9, transactionCount: 38 },
  { month: "2026-06", income: 5_500_000, expenses: 2_640_000, savings: 2_860_000, savingsRate: 52, transactionCount: 44 },
  { month: "2026-07", income: 5_500_000, expenses: 2_120_000, savings: 3_380_000, savingsRate: 61.5, transactionCount: 39 },
  { month: "2026-08", income: 4_800_000, expenses: 1_920_000, savings: 2_880_000, savingsRate: 60, transactionCount: 36 },
  { month: "2026-09", income: 5_500_000, expenses: 1_655_000, savings: 3_845_000, savingsRate: 69.9, transactionCount: 42 },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Wallet, title: "Five-second entries", text: "One button, amount auto-focused, category and tags. Income or expense, done before the chai cools." },
  { icon: ChartColumn, title: "Analytics that add up", text: "Balance, savings rate, category breakdowns and month-over-month deltas, computed in code, never guessed." },
  { icon: CalendarDays, title: "Calendar view", text: "See every rupee on the day it moved. Month and week views with per-day totals." },
  { icon: BrainCircuit, title: "Local AI insights", text: "Ollama on your own machine explains your month, spots patterns and answers questions. Nothing leaves your laptop." },
  { icon: Repeat, title: "Recurring rules", text: "Salary, rent, EMIs and subscriptions post themselves on their due dates." },
  { icon: Download, title: "Your data, exportable", text: "JSON backups and CSV exports any time. Import them back with full validation." },
];

const STEPS = [
  { title: "Sign in with Google", text: "One click, no passwords to remember." },
  { title: "Add your first transaction", text: "Salary in, dinner out. Categories and tags included." },
  { title: "Let AI explain your month", text: "Summaries and answers, computed from your real numbers." },
];

export default async function LandingPage() {
  const authEnabled = isAuthConfigured();
  const user = authEnabled ? await getCurrentUser() : null;
  const ctaHref = user ? "/dashboard" : authEnabled ? "/login" : "/dashboard";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <BrandLogo />
        <nav aria-label="Landing" className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#preview" className="hover:text-foreground">
            Dashboard
          </a>
          <a href="#privacy" className="hover:text-foreground">
            Privacy
          </a>
        </nav>
        <Link
          href={user ? "/dashboard" : "/login"}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
        >
          {user ? "Dashboard" : "Sign in"}
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-10 lg:grid-cols-[1.5fr_1fr] lg:pt-16">
          <div>
            <h1 className="display-heading text-[13vw] text-foreground sm:text-6xl lg:text-[4.5rem] xl:text-[5.25rem]" data-testid="hero-title">
              Know where
              <br />
              your money
              <br />
              goes
            </h1>
            <p className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Income, expenses and savings in ₹, tracked in seconds and explained by AI that runs on your own machine.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <Link
                href={ctaHref}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-xs font-extrabold uppercase tracking-[0.15em] text-brand-foreground shadow-glow-brand transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]"
                data-testid="cta-primary"
              >
                {ctaLabel}
              </Link>
              <Link
                href="#preview"
                aria-label="See the dashboard"
                className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <ArrowUpRight className="size-5" aria-hidden />
              </Link>
            </div>
            <div className="mt-20 hidden lg:block">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="size-2 rounded-full bg-expense" aria-hidden />
                Private by design
              </p>
              <p className="mt-1 text-5xl font-black tracking-tight text-foreground/15">100% yours</p>
            </div>
          </div>

          <ol className="self-center divide-y divide-border border-y border-border lg:mt-24">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start justify-between gap-6 py-6">
                <div>
                  <p className="text-xs font-semibold text-brand">0{index + 1}</p>
                  <p className="mt-1 text-base font-bold leading-tight">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
                </div>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
              </li>
            ))}
          </ol>
        </section>

        {/* Preview */}
        <section id="preview" className="border-t border-border bg-panel py-20">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">The dashboard</p>
            <h2 className="display-heading mt-3 text-4xl sm:text-5xl">Every number, computed.</h2>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">
              Sample data below. Your own dashboard shows the same cards driven by your transactions, with month navigation, a calendar and a full analytics page.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <IncomeCard amount={5_500_000} changePercent={14.6} series={SAMPLE_SERIES} />
              <ExpenseCard amount={1_655_000} changePercent={-13.8} series={SAMPLE_SERIES} perDay={110_333} />
              <SavingsGauge rate={69.9} savings={3_845_000} />
              <TopCategoryCard item={{ categoryId: "sample", name: "Food", icon: "utensils", color: "orange", amount: 450_000, count: 14, percentage: 27.2 }} month="2026-09" />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <MonthlyBars series={SAMPLE_SERIES} currentMonth="2026-09" className="xl:col-span-2" />
              <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">AI financial summary</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;This month you received ₹55,000 and spent ₹16,550, saving ₹38,450. Your largest category was Food at ₹4,500. Your savings rate is 69.9%.&rdquo;
                </p>
                <p className="mt-4 text-[11px] text-muted-foreground">Figures calculated by the app; the model only writes the words.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Features</p>
          <h2 className="display-heading mt-3 text-4xl sm:text-5xl">Built for daily use</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="rounded-2xl border border-border bg-card p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Privacy */}
        <section id="privacy" className="border-t border-border bg-panel py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Privacy</p>
              <h2 className="display-heading mt-3 text-4xl sm:text-5xl">
                Your data.
                <br />
                Your machine.
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Lock, title: "Your database", text: "Transactions live in the PostgreSQL you configure, or an embedded local database on your laptop." },
                { icon: ShieldCheck, title: "Local AI", text: "With Ollama, AI requests are processed on your computer. No financial data goes to a cloud model unless you choose one." },
                { icon: BrainCircuit, title: "AI never decides", text: "Every total, percentage and comparison is computed by the app. The model only explains the result." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="rounded-2xl border border-border bg-card p-5">
                    <Icon className="size-5 text-income" aria-hidden />
                    <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="display-heading text-5xl sm:text-6xl">Start tracking today</h2>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-xs font-extrabold uppercase tracking-[0.15em] text-brand-foreground shadow-glow-brand transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <BrandLogo size="sm" />
          <p>Personal finance tracker · INR · Local AI via Ollama</p>
        </div>
      </footer>
    </div>
  );
}
