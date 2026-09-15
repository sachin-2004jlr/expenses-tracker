"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Funnel, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/shared/category-icon";
import { formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TransactionFilters } from "@/lib/validation/transaction";
import type { Category } from "@/types";

export interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  categories: Category[];
  tags: { name: string; count: number }[];
  /** Raw month param (kept as a chip so month-scoped links from the dashboard stay obvious). */
  month?: string;
  className?: string;
}

const ALL = "__all";

export function TransactionFiltersBar({ filters, categories, tags, month, className }: TransactionFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Merge `changes` into the *live* URL (not the render-time snapshot) so a debounced search
   * write and an immediate filter click never overwrite each other. Any pending search text
   * is flushed at the same time.
   */
  const update = (changes: Record<string, string | null | undefined>, options: { query?: string } = {}) => {
    if (debounce.current) {
      clearTimeout(debounce.current);
      debounce.current = null;
    }
    const live = typeof window === "undefined" ? searchParams.toString() : window.location.search;
    const params = new URLSearchParams(live);
    const pendingQuery = (options.query ?? query).trim();
    const merged: Record<string, string | null | undefined> = { q: pendingQuery || null, ...changes };
    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined || value === "" || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const next = params.toString();
    startTransition(() => router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false }));
  };

  // Clear any pending debounced search on unmount.
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => update({}, { query: value }), 300);
  };

  const activeCount =
    (filters.type ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.min !== null || filters.max !== null ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0);

  const incomeCategories = categories.filter((c) => c.type === "INCOME" && (!filters.type || filters.type === "INCOME"));
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" && (!filters.type || filters.type === "EXPENSE"));
  const categoryItems = [{ value: ALL, label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

  const clearAll = () => {
    setQuery("");
    update({ q: null, type: null, category: null, from: null, to: null, min: null, max: null, tags: null, month: null, sort: null, dir: null });
  };

  return (
    <div className={cn("flex flex-col gap-3", pending && "opacity-80", className)} data-testid="transaction-filters">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search description, notes, category, tags"
            aria-label="Search transactions"
          />
        </InputGroup>

        <div role="radiogroup" aria-label="Transaction type" className="inline-flex items-center rounded-lg bg-muted p-0.5">
          {[
            { value: ALL, label: "All" },
            { value: "INCOME", label: "Income" },
            { value: "EXPENSE", label: "Expense" },
          ].map((option) => {
            const active = (filters.type ?? ALL) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ type: option.value })}
                className={cn(
                  "h-7 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <Select value={filters.category ?? ALL} onValueChange={(value) => update({ category: value })} items={categoryItems}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {incomeCategories.length > 0 && (
              <SelectGroup>
                <SelectLabel>Income</SelectLabel>
                {incomeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {expenseCategories.length > 0 && (
              <SelectGroup>
                <SelectLabel>Expenses</SelectLabel>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger render={<Button variant="outline" className="sm:ml-auto" />}>
            <Funnel data-icon="inline-start" aria-hidden />
            More filters
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">{activeCount}</span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date range</legend>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="filter-from" className="text-xs">From</Label>
                  <Input id="filter-from" type="date" defaultValue={filters.from ?? ""} onChange={(e) => update({ from: e.target.value || null })} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="filter-to" className="text-xs">To</Label>
                  <Input id="filter-to" type="date" defaultValue={filters.to ?? ""} onChange={(e) => update({ to: e.target.value || null })} />
                </div>
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount (₹)</legend>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="filter-min" className="text-xs">Min</Label>
                  <Input
                    id="filter-min"
                    inputMode="decimal"
                    placeholder="0"
                    defaultValue={filters.min !== null && filters.min !== undefined ? String(filters.min / 100) : ""}
                    onBlur={(e) => update({ min: e.target.value.trim() || null })}
                    onKeyDown={(e) => e.key === "Enter" && update({ min: (e.target as HTMLInputElement).value.trim() || null })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="filter-max" className="text-xs">Max</Label>
                  <Input
                    id="filter-max"
                    inputMode="decimal"
                    placeholder="Any"
                    defaultValue={filters.max !== null && filters.max !== undefined ? String(filters.max / 100) : ""}
                    onBlur={(e) => update({ max: e.target.value.trim() || null })}
                    onKeyDown={(e) => e.key === "Enter" && update({ max: (e.target as HTMLInputElement).value.trim() || null })}
                  />
                </div>
              </div>
            </fieldset>
            {tags.length > 0 && (
              <fieldset className="grid gap-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</legend>
                <ul className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto">
                  {tags.map((tag) => {
                    const checked = filters.tags.includes(tag.name);
                    return (
                      <li key={tag.name}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const set = new Set(filters.tags);
                              if (next) set.add(tag.name);
                              else set.delete(tag.name);
                              update({ tags: Array.from(set).join(",") || null });
                            }}
                          />
                          <span className="truncate">#{tag.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{tag.count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="justify-start">
              <X data-icon="inline-start" aria-hidden />
              Clear all filters
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {(month || filters.tags.length > 0 || filters.from || filters.to || filters.min !== null || filters.max !== null) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {month && <FilterChip label={formatMonthLabel(month)} onRemove={() => update({ month: null })} />}
          {filters.from && <FilterChip label={`From ${filters.from}`} onRemove={() => update({ from: null })} />}
          {filters.to && <FilterChip label={`To ${filters.to}`} onRemove={() => update({ to: null })} />}
          {filters.min !== null && filters.min !== undefined && <FilterChip label={`Min ₹${filters.min / 100}`} onRemove={() => update({ min: null })} />}
          {filters.max !== null && filters.max !== undefined && <FilterChip label={`Max ₹${filters.max / 100}`} onRemove={() => update({ max: null })} />}
          {filters.tags.map((tag) => (
            <FilterChip
              key={tag}
              label={`#${tag}`}
              onRemove={() => update({ tags: filters.tags.filter((t) => t !== tag).join(",") || null })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}
