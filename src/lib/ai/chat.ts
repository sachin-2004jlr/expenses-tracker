import { getDashboardSummary } from "@/lib/analytics/queries";
import { formatMonthLabel, previousMonthKey } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatCurrency, formatPercent } from "@/lib/money";
import { getSettings } from "@/lib/services/settings";
import type { ChatMessage, DashboardSummary, MonthKey } from "@/types";
import { buildMonthlyFacts, changeFact, moneyFact } from "./facts";
import { buildChatSystemPrompt } from "./prompts";
import { isAIProviderError } from "./provider";
import { getAIProvider } from "./registry";

/**
 * AI chat assistant.
 *
 * 1. The question is matched against known intents ("how much did I spend on food?").
 * 2. For matched intents the answer is computed deterministically from the dashboard summary.
 * 3. The model receives the facts + the computed answer and only explains them.
 */

export interface ChatAnswerContext {
  summary: DashboardSummary;
  computedAnswer: string | null;
  intent: string | null;
}

const CATEGORY_STOP_WORDS = new Set(["on", "for", "in", "at", "the", "my", "this", "month", "last", "did", "i", "spend", "spent", "much", "how"]);

function findCategory(question: string, summary: DashboardSummary) {
  const lower = question.toLowerCase();
  const all = [...summary.expenseCategories, ...summary.incomeCategories];
  // Longest category name that appears in the question wins ("other income" before "other").
  const matches = all
    .filter((c) => lower.includes(c.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  if (matches[0]) return matches[0];
  // Try single words in the question against category names (e.g. "groceries" vs "Groceries").
  const words = lower.split(/[^a-z]+/).filter((w) => w.length > 2 && !CATEGORY_STOP_WORDS.has(w));
  for (const word of words) {
    const match = all.find((c) => c.name.toLowerCase() === word || c.name.toLowerCase() === `${word}s` || `${c.name.toLowerCase()}s` === word);
    if (match) return match;
  }
  return null;
}

/** Deterministic answers for common questions. Returns null when no intent matches. */
export function computeAnswer(question: string, summary: DashboardSummary): { intent: string; answer: string } | null {
  const q = question.toLowerCase().trim();
  const monthLabel = formatMonthLabel(summary.month);
  const prevLabel = formatMonthLabel(previousMonthKey(summary.month));
  const { current, previous, comparison } = summary;
  const noData = current.transactionCount === 0;

  if (/\b(compare|comparison|versus|vs\.?|last month|previous month)\b/.test(q)) {
    if (noData && previous.transactionCount === 0) {
      return { intent: "compare", answer: `There are no transactions recorded in ${monthLabel} or ${prevLabel} yet.` };
    }
    return {
      intent: "compare",
      answer:
        `${monthLabel} vs ${prevLabel}: income ${formatCurrency(current.income)} vs ${formatCurrency(previous.income)} (${changeFact(comparison.income.changePercent)}); ` +
        `expenses ${formatCurrency(current.expenses)} vs ${formatCurrency(previous.expenses)} (${changeFact(comparison.expenses.changePercent)}); ` +
        `savings ${formatCurrency(current.savings)} vs ${formatCurrency(previous.savings)} (${changeFact(comparison.savings.changePercent)}).`,
    };
  }

  if (/\b(trend|over time|recent months|past months|history)\b/.test(q)) {
    const series = summary.series
      .map((m) => `${formatMonthLabel(m.month, { style: "short" })}: spent ${formatCurrency(m.expenses)}, saved ${formatCurrency(m.savings)}`)
      .join("; ");
    return { intent: "trend", answer: `Spending trend for the last ${summary.series.length} months: ${series}.` };
  }

  if (/\b(biggest|largest|highest|most expensive|top)\b.*\b(expense|purchase|transaction|spend|payment)\b/.test(q) || /\bbiggest expense\b/.test(q)) {
    const top = summary.largestExpenses[0];
    if (!top) return { intent: "largest-expense", answer: `There are no expenses recorded in ${monthLabel} yet.` };
    return {
      intent: "largest-expense",
      answer: `Your biggest expense in ${monthLabel} was "${top.description}" (${top.category.name}) for ${formatCurrency(top.amount)} on ${top.date}.`,
    };
  }

  if (/\b(where|which category|what category|most of my money|money go|spend the most|spent the most)\b/.test(q)) {
    const top = summary.expenseCategories[0];
    if (!top) return { intent: "top-category", answer: `There are no expenses recorded in ${monthLabel} yet.` };
    const rest = summary.expenseCategories
      .slice(1, 4)
      .map((c) => `${c.name} ${formatCurrency(c.amount)} (${c.percentage.toFixed(1)}%)`)
      .join(", ");
    return {
      intent: "top-category",
      answer: `In ${monthLabel} most of your money went to ${top.name}: ${formatCurrency(top.amount)}, ${top.percentage.toFixed(1)}% of expenses${rest ? `. Next: ${rest}` : ""}.`,
    };
  }

  if (/\b(save|saved|savings|saving rate|savings rate)\b/.test(q)) {
    if (noData) return { intent: "savings", answer: `There are no transactions recorded in ${monthLabel} yet.` };
    const rate = current.savingsRate === null ? "no savings rate (no income recorded)" : `a savings rate of ${formatPercent(current.savingsRate)}`;
    return {
      intent: "savings",
      answer: `In ${monthLabel} you saved ${formatCurrency(current.savings)} (income ${formatCurrency(current.income)} minus expenses ${formatCurrency(current.expenses)}), ${rate}.`,
    };
  }

  if (/\b(balance|net worth|total money|how much do i have)\b/.test(q)) {
    return {
      intent: "balance",
      answer: `Your total balance across all tracked transactions is ${formatCurrency(summary.totalBalance)} (all-time income ${formatCurrency(summary.allTimeIncome)} minus all-time expenses ${formatCurrency(summary.allTimeExpenses)}).`,
    };
  }

  if (/\b(income|earn|earned|received|salary)\b/.test(q) && !/\bspend|spent\b/.test(q)) {
    if (noData) return { intent: "income", answer: `There is no income recorded in ${monthLabel} yet.` };
    const sources = summary.incomeCategories.slice(0, 3).map((c) => `${c.name} ${formatCurrency(c.amount)}`).join(", ");
    return { intent: "income", answer: `Your income in ${monthLabel} was ${formatCurrency(current.income)}${sources ? ` (${sources})` : ""}.` };
  }

  if (/\b(spend|spent|spending|expense|expenses|cost|paid)\b/.test(q)) {
    const category = findCategory(q, summary);
    if (category) {
      return {
        intent: "category-spend",
        answer: `In ${monthLabel} you ${category.name && summary.incomeCategories.includes(category) ? "received" : "spent"} ${formatCurrency(category.amount)} on ${category.name} across ${category.count} transaction${category.count === 1 ? "" : "s"} (${category.percentage.toFixed(1)}% of the total).`,
      };
    }
    if (noData) return { intent: "spend", answer: `There are no expenses recorded in ${monthLabel} yet.` };
    return {
      intent: "spend",
      answer: `In ${monthLabel} you spent ${formatCurrency(current.expenses)} across ${summary.expenseCategories.reduce((n, c) => n + c.count, 0)} expense transactions.`,
    };
  }

  return null;
}

export async function buildChatContext(userId: string, question: string, month: MonthKey): Promise<ChatAnswerContext> {
  const summary = await getDashboardSummary(userId, month);
  const computed = computeAnswer(question, summary);
  return { summary, computedAnswer: computed?.answer ?? null, intent: computed?.intent ?? null };
}

export interface ChatStreamResult {
  stream: ReadableStream<string>;
  computedAnswer: string | null;
  intent: string | null;
  model: string | null;
}

export async function streamChatAnswer(userId: string, messages: ChatMessage[], month: MonthKey): Promise<ChatStreamResult> {
  const settings = await getSettings(userId);
  if (!settings.aiEnabled) throw new AppError(503, "ai_disabled", "AI features are turned off. Enable them in Settings → AI.");
  const provider = getAIProvider(settings);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const context = await buildChatContext(userId, lastUser?.content ?? "", month);
  const facts = {
    ...buildMonthlyFacts(context.summary),
    totalBalanceAllTime: moneyFact(context.summary.totalBalance),
  };
  const system = buildChatSystemPrompt({
    facts,
    computedAnswer: context.computedAnswer,
    monthLabel: formatMonthLabel(month),
  });
  try {
    const [stream, model] = await Promise.all([
      provider.streamChat({ system, messages: messages.slice(-12), temperature: 0.4 }),
      provider.resolveModel().catch(() => null),
    ]);
    return { stream, computedAnswer: context.computedAnswer, intent: context.intent, model };
  } catch (error) {
    if (isAIProviderError(error)) throw new AppError(503, "ai_unavailable", error.message);
    throw new AppError(503, "ai_unavailable", provider.isLocal ? "Local AI is unavailable. Start Ollama to enable the assistant." : "The AI provider is unavailable right now.");
  }
}
