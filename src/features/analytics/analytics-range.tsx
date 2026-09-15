"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RangeSelector } from "@/components/shared/range-selector";
import type { RangePreset } from "@/types";

/** Range selector that writes `?range=` so the whole analytics page re-renders server-side. */
export function AnalyticsRange({ value }: { value: RangePreset }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (next: RangePreset) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "6m") params.delete("range");
    else params.set("range", next);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return <RangeSelector value={value} onChange={onChange} className={pending ? "opacity-70" : undefined} />;
}
