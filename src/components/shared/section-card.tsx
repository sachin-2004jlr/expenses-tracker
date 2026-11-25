import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionCardProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned header content, e.g. a <SectionLink>. */
  action?: ReactNode;
  /** Accessible name when the title is not plain text. */
  label?: string;
}

/** The one card used across the app: a short title, an optional one-line description, then content. */
export function SectionCard({ title, description, action, label, className, children, ...props }: SectionCardProps) {
  return (
    <section
      aria-label={label ?? (typeof title === "string" ? title : undefined)}
      className={cn("flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5", className)}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug text-balance">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-pretty text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** "View all ›" style link for card headers. */
export function SectionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "inline-flex h-7 items-center gap-0.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}
