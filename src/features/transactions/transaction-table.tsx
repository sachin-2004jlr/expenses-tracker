"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/money";
import { formatIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TransactionFilters } from "@/lib/validation/transaction";
import type { Transaction } from "@/types";
import { useTransactionDialog } from "./transaction-dialog-provider";
import { TransactionRowActions } from "./transaction-row-actions";

export interface TransactionTableProps {
  transactions: Transaction[];
  sort: TransactionFilters["sort"];
  dir: TransactionFilters["dir"];
  dateFormat: string;
  hasFilters: boolean;
}

type SortField = TransactionFilters["sort"];

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "date", label: "Date", className: "w-28 lg:w-32" },
  { field: "description", label: "Description" },
  { field: "category", label: "Category", className: "w-36 lg:w-44" },
  { field: "amount", label: "Amount", className: "w-36 text-right" },
];

export function TransactionTable({ transactions, sort, dir, dateFormat, hasFilters }: TransactionTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openEdit } = useTransactionDialog();

  const setSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextDir = sort === field ? (dir === "desc" ? "asc" : "desc") : field === "description" || field === "category" ? "asc" : "desc";
    params.set("sort", field);
    params.set("dir", nextDir);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={hasFilters ? "No transactions match these filters" : "No transactions yet"}
        description={hasFilters ? "Try widening the date range or clearing a filter." : "Start by adding your first income or expense."}
        action={!hasFilters ? <AddTransactionButton /> : undefined}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((column) => {
                const active = sort === column.field;
                const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead key={column.field} className={cn(column.className, "px-3")} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      onClick={() => setSort(column.field)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm text-xs font-medium uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        active ? "text-foreground" : "text-muted-foreground",
                        column.field === "amount" && "flex-row-reverse",
                      )}
                    >
                      {column.label}
                      <Icon className="size-3" aria-hidden />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="hidden w-24 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">Type</TableHead>
              <TableHead className="w-12 px-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="cursor-pointer" onClick={() => openEdit(tx)} data-testid="transaction-row">
                <TableCell className="px-3 text-muted-foreground tabular-nums">{formatIsoDate(tx.date, dateFormat)}</TableCell>
                <TableCell className="max-w-0 px-3">
                  <div className="truncate font-medium">{tx.description}</div>
                  {(tx.notes || tx.tags.length > 0) && (
                    <div className="truncate text-xs text-muted-foreground">
                      {tx.tags.map((t) => `#${t.name}`).join(" ")}
                      {tx.tags.length > 0 && tx.notes ? " · " : ""}
                      {tx.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-3">
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={tx.category.icon} color={tx.category.color} size="sm" />
                    <span className="truncate">{tx.category.name}</span>
                  </span>
                </TableCell>
                <TableCell className="px-3 text-right">
                  <Amount paise={tx.amount} type={tx.type} className="font-semibold" />
                </TableCell>
                <TableCell className="hidden px-3 lg:table-cell">
                  <Badge variant="outline" className={cn(tx.type === "INCOME" ? "border-income/40 text-income-foreground" : "border-expense/40 text-expense-foreground")}>
                    {tx.type === "INCOME" ? "Income" : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                  <TransactionRowActions transaction={tx} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden" aria-label="Transactions">
        {transactions.map((tx) => (
          <li key={tx.id} className="flex items-center gap-2 rounded-xl bg-card p-3 pr-1.5 ring-1 ring-foreground/10">
            <button type="button" onClick={() => openEdit(tx)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Edit ${tx.description}`}>
              <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 hyphens-auto break-words text-sm font-medium">{tx.description}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tx.category.name} · {formatIsoDate(tx.date, dateFormat)}
                  {tx.tags.length > 0 && <> · {tx.tags.map((t) => `#${t.name}`).join(" ")}</>}
                </span>
              </span>
              <Amount paise={tx.amount} type={tx.type} className="shrink-0 whitespace-nowrap text-sm font-semibold" />
            </button>
            <TransactionRowActions transaction={tx} />
          </li>
        ))}
      </ul>
    </>
  );
}
