import type { Metadata } from "next";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SavingsEntryList } from "@/features/savings/savings-entry-list";
import { SavingsAddButtons } from "@/features/savings/savings-shell";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import { listSavingsEntries } from "@/lib/services/savings-entries";
import { cn } from "@/lib/utils";
import { parseSavingsEntryFilters } from "@/lib/validation/savings";

export const metadata: Metadata = { title: "Savings entries" };

const KIND_TABS = [
  { value: undefined, label: "All" },
  { value: "DEPOSIT", label: "Added" },
  { value: "SPEND", label: "Used" },
] as const;

export default async function SavingsEntriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const allTime = params.range === "all";
  const filters = parseSavingsEntryFilters({ ...params, month: allTime ? undefined : month, pageSize: "200" });
  const result = await listSavingsEntries(context.userId, filters);
  const base = (extra: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    if (params.month) query.set("month", month);
    for (const [k, v] of Object.entries({ kind: filters.kind, range: allTime ? "all" : undefined, ...extra })) if (v) query.set(k, v);
    const s = query.toString();
    return s ? `/savings/entries?${s}` : "/savings/entries";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={allTime ? "All time" : formatMonthLabel(month)}
        title="Savings entries"
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Added <span className="font-medium text-income-foreground tabular-nums">{formatCurrency(result.totals.added)}</span>
            </span>
            <span>
              Used <span className="font-medium text-saved-foreground tabular-nums">{formatCurrency(result.totals.used)}</span>
            </span>
            <span>
              Net <span className="font-medium tabular-nums">{formatCurrency(result.totals.net)}</span>
            </span>
          </span>
        }
        actions={<SavingsAddButtons />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Entry type" className="inline-flex items-center rounded-lg bg-muted p-0.5">
          {KIND_TABS.map((tab) => {
            const active = filters.kind === tab.value;
            return (
              <Link
                key={tab.label}
                role="tab"
                aria-selected={active}
                href={base({ kind: tab.value })}
                prefetch
                scroll={false}
                className={cn(
                  "flex h-7 items-center rounded-md px-3 text-xs font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div role="tablist" aria-label="Period" className="inline-flex items-center rounded-lg bg-muted p-0.5">
          {[
            { label: formatMonthLabel(month, { style: "short" }), range: undefined },
            { label: "All time", range: "all" },
          ].map((tab) => {
            const active = allTime === (tab.range === "all");
            return (
              <Link
                key={tab.label}
                role="tab"
                aria-selected={active}
                href={base({ range: tab.range })}
                prefetch
                scroll={false}
                className={cn(
                  "flex h-7 items-center rounded-md px-3 text-xs font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card px-4 py-2 sm:px-5">
        {result.items.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={allTime ? "No savings entries yet" : `No savings entries in ${formatMonthLabel(month)}`}
            description="Use the buttons above to add savings or record what you did with them."
            compact
            className="my-3"
          />
        ) : (
          <SavingsEntryList entries={result.items} dateFormat={context.settings.dateFormat} />
        )}
      </section>
      {result.total > result.items.length && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the latest {result.items.length} of {result.total} entries.
        </p>
      )}
    </div>
  );
}
