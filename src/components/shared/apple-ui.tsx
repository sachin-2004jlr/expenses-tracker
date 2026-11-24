import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex items-center gap-0.5 rounded-full text-base text-link transition-opacity duration-300 ease-(--ease-apple) hover:underline active:opacity-60 disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-income-foreground";

/** Apple-style text link: "See offers ›" / "Connect with a Specialist ↗". */
export function ActionLink({ href, children, external, className }: { href: string; children: ReactNode; external?: boolean; className?: string }) {
  const Icon = external ? ArrowUpRight : ChevronRight;
  return (
    <Link href={href} prefetch className={cn(linkClass, className)}>
      {children}
      <Icon className="size-4" aria-hidden />
    </Link>
  );
}

/** The same look for actions that open a dialog instead of navigating. */
export function ActionButton({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" className={cn(linkClass, className)} {...props}>
      {children}
      <ChevronRight className="size-4" aria-hidden />
    </button>
  );
}

/** Two-tone section heading: "The latest. Take a look at what's new." */
export function SectionHeading({ title, subtitle, className, id }: { title: string; subtitle?: string; className?: string; id?: string }) {
  return (
    <h3 id={id} className={cn("font-heading text-2xl font-semibold text-balance md:text-3xl", className)}>
      {title} {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
    </h3>
  );
}

/** Small orange label above a tile title, like Apple's "New". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold text-ember dark:text-flame", className)}>{children}</p>;
}
