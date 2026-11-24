import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  /** Show the wordmark next to the mark. */
  withText?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Ink circle mark + sentence-case wordmark. */
export function BrandLogo({ withText = true, href = "/", size = "md", className }: BrandLogoProps) {
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-9";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-[18px]";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-base";
  const content = (
    <>
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-ink text-canvas dark:bg-canvas dark:text-ink", box)}>
        <ShieldCheck className={icon} aria-hidden />
      </span>
      {withText && <span className={cn("font-heading font-semibold tracking-tight text-foreground", text)}>Expenses</span>}
    </>
  );
  return (
    <Link href={href} aria-label="Expenses Tracker home" className={cn("inline-flex items-center gap-2.5", className)}>
      {content}
    </Link>
  );
}
