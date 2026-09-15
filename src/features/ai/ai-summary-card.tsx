"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Lightbulb,
  RefreshCw,
  Settings,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AiInsightResult, FinancialHealth, InsightKind, MonthKey } from "@/types";
import { useAiStatus } from "./use-ai-status";

export interface AiSummaryCardProps {
  month: MonthKey;
  initial: AiInsightResult | null;
  /** Whether the month has any transactions (no point calling the model otherwise). */
  hasData: boolean;
  aiEnabled: boolean;
  autoAnalyze: boolean;
  className?: string;
}

const KIND_LABEL: Record<InsightKind, string> = {
  MONTHLY: "Monthly summary",
  SPENDING: "Spending analysis",
  COMPARISON: "Month comparison",
};

const HEALTH_STYLE: Record<FinancialHealth, string> = {
  excellent: "bg-income/12 text-income-foreground",
  good: "bg-income/12 text-income-foreground",
  fair: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  concerning: "bg-expense/12 text-expense-foreground",
  unknown: "bg-muted text-muted-foreground",
};

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function AiSummaryCard({ month, initial, hasData, aiEnabled, autoAnalyze, className }: AiSummaryCardProps) {
  const { status, loading: statusLoading, refresh: refreshStatus } = useAiStatus({ auto: aiEnabled });
  const [kind, setKind] = useState<InsightKind>(initial?.kind ?? "MONTHLY");
  const [result, setResult] = useState<AiInsightResult | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoRanFor = useRef<string | null>(null);

  // The page mounts this card with `key={month}`, so a month change resets state naturally.

  const analyse = useCallback(
    async (targetKind: InsightKind, force = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: targetKind, month, force }),
          signal: controller.signal,
        });
        if (response.status === 204) {
          setResult(null);
          return;
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
          throw new Error(body.error?.message ?? `AI request failed (HTTP ${response.status})`);
        }
        setResult((await response.json()) as AiInsightResult);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "AI request failed");
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [month],
  );

  // Optional auto-analysis: only when enabled, the provider is reachable, there is data and no fresh cache.
  useEffect(() => {
    if (!autoAnalyze || !aiEnabled || !hasData || !status?.available) return;
    if (result && result.month === month) return;
    const key = `${month}:${kind}`;
    if (autoRanFor.current === key) return;
    autoRanFor.current = key;
    void analyse(kind);
  }, [autoAnalyze, aiEnabled, hasData, status?.available, result, month, kind, analyse]);

  const switchKind = (next: InsightKind) => {
    setKind(next);
    if (result?.kind !== next) {
      setResult(null);
      if (hasData && status?.available) void analyse(next);
    }
  };

  const unavailable = aiEnabled && status && !status.available;
  const monthLabel = formatMonthLabel(month);

  return (
    <Card className={cn("relative overflow-visible", className)} data-testid="ai-summary-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-savings/12 text-savings-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          AI financial summary
        </CardTitle>
        <CardDescription>
          {status?.available
            ? `${status.providerLabel}${status.selectedModel ? ` · ${status.selectedModel}` : ""}`
            : "Interprets the numbers the app has already calculated."}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {result && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {result.cached ? "Cached" : "Fresh"}
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => analyse(kind, Boolean(result))}
            disabled={loading || !aiEnabled || !hasData || (status ? !status.available : statusLoading)}
            data-testid="analyze-button"
          >
            {loading ? <RefreshCw data-icon="inline-start" className="animate-spin" aria-hidden /> : <Sparkles data-icon="inline-start" aria-hidden />}
            {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze with AI"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div role="tablist" aria-label="Insight type" className="flex flex-wrap gap-1">
          {(Object.keys(KIND_LABEL) as InsightKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => switchKind(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                kind === k ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {!aiEnabled ? (
          <Notice icon={Settings} tone="muted" title="AI features are turned off">
            Enable them in <Link href="/settings?tab=ai" className="underline underline-offset-2">Settings → AI</Link>.
          </Notice>
        ) : unavailable ? (
          <Notice icon={WifiOff} tone="warning" title={status.isLocal ? "Local AI is unavailable. Start Ollama to enable AI insights." : "AI provider is unavailable."}>
            {status.message && <span className="block">{status.message}</span>}
            <span className="mt-2 flex flex-wrap gap-2">
              <Button size="xs" variant="outline" onClick={() => refreshStatus()} disabled={statusLoading}>
                <RefreshCw data-icon="inline-start" className={cn(statusLoading && "animate-spin")} aria-hidden />
                Check again
              </Button>
              <Button size="xs" variant="ghost" render={<Link href="/settings?tab=ai" />}>
                AI settings
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Button>
            </span>
          </Notice>
        ) : !hasData ? (
          <Notice icon={Lightbulb} tone="muted" title={`Nothing to analyse for ${monthLabel} yet`}>
            Add a few transactions and the assistant can summarise the month.
          </Notice>
        ) : loading && !result ? (
          <div className="space-y-2" aria-live="polite" aria-busy="true">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" aria-hidden />
              Analyzing your finances…
            </p>
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        ) : error ? (
          <Notice icon={TriangleAlert} tone="error" title="AI request failed">
            {error}
          </Notice>
        ) : result ? (
          <InsightBody result={result} />
        ) : (
          <Notice icon={Sparkles} tone="muted" title={`Ready to analyse ${monthLabel}`}>
            Click <strong>Analyze with AI</strong>. Your numbers are computed by the app; the model only explains them.
          </Notice>
        )}
      </CardContent>
    </Card>
  );
}

function InsightBody({ result }: { result: AiInsightResult }) {
  const { insight } = result;
  return (
    <div className="grid gap-4" data-testid="ai-insight" aria-live="polite">
      <div className="flex flex-wrap items-start gap-3">
        <p className="min-w-0 flex-1 text-sm leading-relaxed">{insight.summary}</p>
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize", HEALTH_STYLE[insight.financialHealth])}>
          {insight.financialHealth === "unknown" ? "Health: n/a" : `Health: ${insight.financialHealth}`}
        </span>
      </div>
      {result.degraded && (
        <p className="text-xs text-muted-foreground">The model did not return structured output, so only its raw summary is shown.</p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <InsightList title="Highlights" icon={CircleCheck} items={insight.highlights} tone="text-income-foreground" />
        <InsightList title="Concerns" icon={TriangleAlert} items={insight.concerns} tone="text-amber-600 dark:text-amber-400" emptyText="No concerns flagged." />
        <InsightList title="Recommendations" icon={Lightbulb} items={insight.recommendations} tone="text-savings-foreground" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Generated by {result.provider} · {result.model} · {new Date(result.generatedAt).toLocaleString("en-IN")}. All figures are calculated by the app; the AI only interprets them.
      </p>
    </div>
  );
}

function InsightList({
  title,
  icon: Icon,
  items,
  tone,
  emptyText = "Nothing to report.",
}: {
  title: string;
  icon: typeof CircleCheck;
  items: string[];
  tone: string;
  emptyText?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm">
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notice({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Sparkles;
  tone: "muted" | "warning" | "error";
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-3 py-3 text-sm",
        tone === "muted" && "border-border bg-muted/40",
        tone === "warning" && "border-amber-500/30 bg-amber-500/8",
        tone === "error" && "border-destructive/30 bg-destructive/8",
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-amber-600 dark:text-amber-400" : tone === "error" ? "text-destructive" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
