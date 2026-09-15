import type { Metadata } from "next";
import { MonthSelector } from "@/components/shared/month-selector";
import { PageHeader } from "@/components/shared/page-header";
import { AiAssistant } from "@/features/ai/chat";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your finances. Numbers come from the app; the model explains them."
        actions={<MonthSelector month={month} currentMonth={context.currentMonth} size="sm" />}
      />
      <AiAssistant key={month} month={month} aiEnabled={context.settings.aiEnabled} />
    </div>
  );
}
