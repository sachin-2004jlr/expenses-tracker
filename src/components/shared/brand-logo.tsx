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

/** Orange mark + lowercase wordmark, matching the landing-page identity. */
export function BrandLogo({ withText = true, href = "/", size = "md", className }: BrandLogoProps) {
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-[18px]";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const content = (
    <>
      <span className={cn("flex shrink-0 items-center justify-center bg-brand text-brand-foreground shadow-glow-brand", box)}>
        <ShieldCheck className={icon} aria-hidden />
      </span>
      {withText && <span className={cn("font-extrabold tracking-tight text-foreground", text)}>expenses.</span>}
    </>
  );
  return (
    <Link href={href} aria-label="Expenses Tracker home" className={cn("inline-flex items-center gap-2.5", className)}>
      {content}
    </Link>
  );
}
