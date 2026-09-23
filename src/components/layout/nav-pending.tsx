"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Instant feedback while a navigation is in flight. Must be rendered inside a `<Link>`.
 * `className` positions it; it only becomes visible (and pulses) while the link is pending.
 */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("pointer-events-none absolute opacity-0 transition-opacity duration-150", pending && "animate-pulse opacity-100", className)} />;
}
