"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}

export function Pagination({ page, pageCount, total, pageSize }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (total === 0) return null;

  const go = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: true });
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        Showing <span className="font-medium text-foreground tabular-nums">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground tabular-nums">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft aria-hidden />
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {pageCount}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  );
}
