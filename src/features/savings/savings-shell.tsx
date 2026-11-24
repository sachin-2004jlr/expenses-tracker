"use client";

import { ArrowDownToLine } from "lucide-react";
import { ActionButton } from "@/components/shared/apple-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSavingsDialog } from "./savings-dialog-provider";

/** "Add to savings" and "Used from savings" buttons. */
export function SavingsAddButtons({ className }: { className?: string }) {
  const { openCreate } = useSavingsDialog();
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 md:justify-end", className)}>
      <Button onClick={() => openCreate({ kind: "DEPOSIT" })} data-testid="savings-add">
        <ArrowDownToLine data-icon="inline-start" aria-hidden />
        Add to savings
      </Button>
      <ActionButton onClick={() => openCreate({ kind: "SPEND" })} data-testid="savings-use">
        Used from savings
      </ActionButton>
    </div>
  );
}
