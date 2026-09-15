import type { AiModelInfo, AiStatus, ChatMessage } from "@/types";
import {
  AIProviderError,
  DEFAULT_GENERATE_TIMEOUT_MS,
  DEFAULT_STATUS_TIMEOUT_MS,
  unavailableStatus,
  withTimeout,
  type AIProvider,
  type ChatOptions,
  type GenerateOptions,
  type GenerateResult,
} from "./provider";

/**
 * Ollama provider (http://localhost:11434 by default).
 *
 * Uses the native Ollama HTTP API:
 *  - GET  /api/tags  -> installed models
 *  - POST /api/chat  -> chat completion (with `format: "json"` for structured output, streaming for chat)
 */

export interface OllamaProviderOptions {
  baseUrl: string;
  /** Preferred model; when null the first installed chat-capable model is used. */
  model: string | null;
  enabled?: boolean;
}

interface OllamaTagsResponse {
  models?: Array<{
    name: string;
    model?: string;
    size?: number;
    details?: { family?: string; parameter_size?: string };
  }>;
}

interface OllamaChatResponse {
  model?: string;
  message?: { role: string; content: string };
  done?: boolean;
  error?: string;
}

const EMBEDDING_HINTS = ["embed", "bge", "minilm", "e5-", "nomic"];

export function isChatModel(name: string): boolean {
  const lower = name.toLowerCase();
  return !EMBEDDING_HINTS.some((hint) => lower.includes(hint));
}

/** Prefer general chat models when auto-selecting: llama > qwen > gemma > mistral > phi > anything. */
export function pickDefaultModel(models: AiModelInfo[]): string | null {
  const chat = models.filter((m) => isChatModel(m.name));
  if (chat.length === 0) return null;
  const priority = ["llama", "qwen", "gemma", "mistral", "phi", "deepseek"];
  for (const family of priority) {
    const match = chat.find((m) => m.name.toLowerCase().includes(family));
    if (match) return match.name;
  }
  return chat[0]!.name;
}

export function normaliseBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly label = "Ollama (local)";
  readonly isLocal = true;
  readonly endpoint: string;
  private readonly preferredModel: string | null;
  private readonly enabled: boolean;
  private modelCache: { at: number; models: AiModelInfo[] } | null = null;

  constructor(options: OllamaProviderOptions) {
    this.endpoint = normaliseBaseUrl(options.baseUrl);
    this.preferredModel = options.model?.trim() || null;
    this.enabled = options.enabled ?? true;
  }

  async listModels(signal?: AbortSignal): Promise<AiModelInfo[]> {
    if (this.modelCache && Date.now() - this.modelCache.at < 15_000) return this.modelCache.models;
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/api/tags`, {
        signal: withTimeout(signal, DEFAULT_STATUS_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      throw new AIProviderError(`Cannot reach Ollama at ${this.endpoint}. Is it running?`, { retryable: true, cause: error });
    }
    if (!response.ok) {
      throw new AIProviderError(`Ollama responded with HTTP ${response.status} when listing models`, { retryable: true });
    }
    const body = (await response.json()) as OllamaTagsResponse;
    const models: AiModelInfo[] = (body.models ?? []).map((m) => ({
      name: m.name,
      family: m.details?.family,
      parameterSize: m.details?.parameter_size,
      sizeBytes: m.size,
    }));
    this.modelCache = { at: Date.now(), models };
    return models;
  }

  async resolveModel(): Promise<string | null> {
    const models = await this.listModels();
    if (this.preferredModel) {
      const exact = models.find((m) => m.name === this.preferredModel);
      if (exact) return exact.name;
      // Allow "llama3.1" to match "llama3.1:latest".
      const loose = models.find((m) => m.name.split(":")[0] === this.preferredModel);
      if (loose) return loose.name;
    }
    return pickDefaultModel(models);
  }

  async checkStatus(): Promise<AiStatus> {
    if (!this.enabled) return unavailableStatus(this, "AI features are turned off in Settings.", false);
    try {
      const models = await this.listModels();
      const selectedModel = await this.resolveModel();
      const chatModels = models.filter((m) => isChatModel(m.name));
      const message =
        chatModels.length === 0
          ? "Ollama is running but no chat model is installed. Run `ollama pull llama3.2` to add one."
          : this.preferredModel && selectedModel !== this.preferredModel
            ? `Model "${this.preferredModel}" is not installed; using ${selectedModel} instead.`
            : null;
      return {
        enabled: true,
        provider: this.id,
        providerLabel: this.label,
        available: chatModels.length > 0,
        models,
        selectedModel,
        endpoint: this.endpoint,
        message,
        checkedAt: new Date().toISOString(),
        isLocal: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ollama is unavailable";
      return unavailableStatus(this, message);
    }
  }

  private async requireModel(): Promise<string> {
    const model = await this.resolveModel();
    if (!model) {
      throw new AIProviderError("No chat model is installed in Ollama. Run `ollama pull llama3.2` and try again.");
    }
    return model;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = await this.requireModel();
    const body = {
      model,
      stream: false,
      format: options.json ? "json" : undefined,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 900,
      },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
    };
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: withTimeout(options.signal, DEFAULT_GENERATE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AIProviderError(`Could not reach Ollama at ${this.endpoint}.`, { retryable: true, cause: error });
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AIProviderError(`Ollama returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) throw new AIProviderError(`Ollama error: ${data.error}`);
    return { text: data.message?.content ?? "", model: data.model ?? model };
  }

  async streamChat(options: ChatOptions): Promise<ReadableStream<string>> {
    const model = await this.requireModel();
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: options.system },
      ...options.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    ];
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages,
          options: { temperature: options.temperature ?? 0.4, num_predict: options.maxTokens ?? 700 },
        }),
        signal: withTimeout(options.signal, DEFAULT_GENERATE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AIProviderError(`Could not reach Ollama at ${this.endpoint}.`, { retryable: true, cause: error });
    }
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new AIProviderError(`Ollama returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    return ndjsonToTextStream(response.body, (line) => {
      const chunk = JSON.parse(line) as OllamaChatResponse;
      if (chunk.error) throw new AIProviderError(`Ollama error: ${chunk.error}`);
      return chunk.message?.content ?? "";
    });
  }
}

/** Convert an NDJSON byte stream into a stream of text chunks using `extract` per line. */
export function ndjsonToTextStream(
  source: ReadableStream<Uint8Array>,
  extract: (line: string) => string,
): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  return source.pipeThrough(
    new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            const text = extract(line);
            if (text) controller.enqueue(text);
          }
          newline = buffer.indexOf("\n");
        }
      },
      flush(controller) {
        const line = buffer.trim();
        if (line) {
          try {
            const text = extract(line);
            if (text) controller.enqueue(text);
          } catch {
            // ignore trailing partial line
          }
        }
      },
    }),
  );
}
