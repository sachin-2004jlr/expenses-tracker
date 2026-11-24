import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** The big page word, like Apple's "Store". */
  title: ReactNode;
  /** Short tagline on the right, like "The best way to buy the products you love." */
  description?: ReactNode;
  eyebrow?: ReactNode;
  /** Blue text links or small controls under the tagline. */
  actions?: ReactNode;
  className?: string;
}

/**
 * apple.com/store-style page header: a large brush-lettered title on the left and a short tagline
 * with blue links on the right (stacked on phones).
 */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("grid gap-5 pb-2 pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-center md:gap-10 md:pb-6 md:pt-10", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-sm font-semibold text-muted-foreground">{eyebrow}</p>}
        <h2 className="display-heading text-3xl [overflow-wrap:anywhere] md:text-5xl">{title}</h2>
      </div>
      {(description || actions) && (
        <div className="min-w-0 md:text-right">
          {description && <div className="font-heading text-xl font-semibold leading-snug text-balance md:text-2xl">{description}</div>}
          {actions && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 md:justify-end">{actions}</div>}
        </div>
      )}
    </div>
  );
}
