import type { AiModelInfo, AiStatus } from "@/types";
import type { AIProvider, ChatOptions, GenerateOptions, GenerateResult } from "./provider";

/**
 * Deterministic provider used by automated tests and CI so no real model is required.
 * Selected with `AI_PROVIDER=mock`.
 */
export class MockProvider implements AIProvider {
  readonly id = "mock";
  readonly label = "Mock AI (testing)";
  readonly isLocal = true;
  readonly endpoint = null;
  readonly modelName = "mock-model";
  private readonly enabled: boolean;
  private readonly mode: "ok" | "malformed" | "down";

  constructor(options: { enabled?: boolean; mode?: "ok" | "malformed" | "down" } = {}) {
    this.enabled = options.enabled ?? true;
    this.mode = options.mode ?? (process.env.AI_MOCK_MODE as "ok" | "malformed" | "down" | undefined) ?? "ok";
  }

  async resolveModel(): Promise<string | null> {
    return this.mode === "down" ? null : this.modelName;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return this.mode === "down" ? [] : [{ name: this.modelName, family: "mock", parameterSize: "0B" }];
  }

  async checkStatus(): Promise<AiStatus> {
    const available = this.enabled && this.mode !== "down";
    return {
      enabled: this.enabled,
      provider: this.id,
      providerLabel: this.label,
      available,
      models: await this.listModels(),
      selectedModel: available ? this.modelName : null,
      endpoint: null,
      message: !this.enabled ? "AI features are turned off in Settings." : this.mode === "down" ? "Mock AI is simulating an outage." : null,
      checkedAt: new Date().toISOString(),
      isLocal: true,
    };
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    if (this.mode === "down") throw new Error("Mock AI is offline");
    if (this.mode === "malformed") return { text: "Sorry, here is some { broken json", model: this.modelName };
    const facts = extractFacts(options.prompt);
    const insight = {
      summary: `Based on your tracked data for ${facts.month ?? "this month"}, you received ${facts.income ?? "your income"} and spent ${facts.expenses ?? "your expenses"}, leaving savings of ${facts.savings ?? "the remainder"}.`,
      highlights: [
        facts.topCategory ? `Your largest spending category was ${facts.topCategory}.` : "Your spending is spread across categories.",
        facts.savingsRate ? `Your savings rate was ${facts.savingsRate}.` : "Add income to see a savings rate.",
      ],
      concerns: facts.savingsNegative ? ["You spent more than you earned this month."] : [],
      recommendations: ["Review your top spending category for easy wins.", "Keep logging every transaction so trends stay accurate."],
      financialHealth: facts.savingsNegative ? "concerning" : "good",
    };
    return { text: JSON.stringify(insight), model: this.modelName };
  }

  async streamChat(options: ChatOptions): Promise<ReadableStream<string>> {
    if (this.mode === "down") throw new Error("Mock AI is offline");
    const last = options.messages[options.messages.length - 1]?.content ?? "";
    const computed = /Computed answer:\s*(.+)/i.exec(options.system)?.[1]?.trim();
    const reply = computed
      ? `Based on your tracked data, ${computed}`
      : `Based on your tracked data, here is what I can tell you about "${last.slice(0, 80)}": the figures in your dashboard are calculated by the app, and I can only explain them.`;
    const words = reply.split(" ");
    return new ReadableStream<string>({
      start(controller) {
        for (let i = 0; i < words.length; i += 1) controller.enqueue((i === 0 ? "" : " ") + words[i]);
        controller.close();
      },
    });
  }
}

function extractFacts(prompt: string): {
  month?: string;
  income?: string;
  expenses?: string;
  savings?: string;
  savingsRate?: string;
  topCategory?: string;
  savingsNegative: boolean;
} {
  const pick = (key: string) => {
    const match = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`).exec(prompt);
    return match?.[1];
  };
  const savings = pick("savingsFormatted");
  return {
    month: pick("month"),
    income: pick("incomeFormatted"),
    expenses: pick("expensesFormatted"),
    savings,
    savingsRate: pick("savingsRateFormatted"),
    topCategory: pick("topExpenseCategory"),
    savingsNegative: savings?.startsWith("-") ?? false,
  };
}
