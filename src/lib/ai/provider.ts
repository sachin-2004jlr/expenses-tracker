import type { AiModelInfo, AiStatus, ChatMessage } from "@/types";

/**
 * AI provider abstraction.
 *
 * The application only ever talks to this interface. Ollama is the local default; any other
 * backend (OpenAI, Anthropic, Google, an OpenAI-compatible server) plugs in by implementing it
 * and registering in `registry.ts`. The UI never imports a concrete provider.
 *
 * Providers receive already-calculated facts and only produce prose; they never compute money.
 */

export interface GenerateOptions {
  system: string;
  prompt: string;
  /** Ask the model for a JSON object. Providers use native JSON modes when available. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  model: string;
}

export interface ChatOptions {
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  /** True when requests never leave the user's machine. */
  readonly isLocal: boolean;
  readonly endpoint: string | null;
  /** Model that will be used for requests (may be resolved lazily from the available list). */
  resolveModel(): Promise<string | null>;
  listModels(): Promise<AiModelInfo[]>;
  checkStatus(): Promise<AiStatus>;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  /** Stream assistant text chunks for a chat conversation. */
  streamChat(options: ChatOptions): Promise<ReadableStream<string>>;
}

export class AIProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AIProviderError";
    this.retryable = options.retryable ?? false;
  }
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError || (typeof error === "object" && error !== null && (error as { name?: string }).name === "AIProviderError");
}

export const DEFAULT_STATUS_TIMEOUT_MS = 4_000;
export const DEFAULT_GENERATE_TIMEOUT_MS = 180_000;

/** Combine a caller signal with a timeout. */
export function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function unavailableStatus(
  provider: Pick<AIProvider, "id" | "label" | "isLocal" | "endpoint">,
  message: string,
  enabled = true,
): AiStatus {
  return {
    enabled,
    provider: provider.id,
    providerLabel: provider.label,
    available: false,
    models: [],
    selectedModel: null,
    endpoint: provider.endpoint,
    message,
    checkedAt: new Date().toISOString(),
    isLocal: provider.isLocal,
  };
}
