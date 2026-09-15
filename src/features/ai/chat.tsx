"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Bot, Calculator, RefreshCw, Send, Sparkles, Trash, User, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ChatMessage, MonthKey } from "@/types";
import { useAiStatus } from "./use-ai-status";

export const SUGGESTED_QUESTIONS = [
  "How much did I spend this month?",
  "Where did most of my money go?",
  "What was my biggest expense?",
  "How much did I save this month?",
  "Compare this month with last month.",
  "How much did I spend on food?",
  "Show me my spending trend.",
];

interface UiMessage extends ChatMessage {
  id: string;
  computed?: boolean;
  intent?: string;
  error?: boolean;
  streaming?: boolean;
}

interface ApiErrorBody {
  error?: { message?: string };
}

export function AiAssistant({ month, aiEnabled }: { month: MonthKey; aiEnabled: boolean }) {
  const { status, loading: statusLoading, refresh } = useAiStatus({ auto: aiEnabled });
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const available = aiEnabled && status?.available;

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    const userMessage: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage].filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    setInput("");
    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), month }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(body.error?.message ?? `The assistant is unavailable (HTTP ${response.status}).`);
      }
      const computed = response.headers.get("x-ai-computed") === "1";
      const intent = response.headers.get("x-ai-intent") ?? undefined;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, computed, intent: intent === "none" ? undefined : intent } : m)));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        const snapshot = content;
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)));
      }
      if (!content.trim()) content = "The model returned an empty answer. Please try again.";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content, streaming: false } : m)));
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      const message = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: message, error: true, streaming: false } : m)));
    } finally {
      if (abortRef.current === controller) {
        setBusy(false);
        abortRef.current = null;
      }
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-h-[60vh] flex-col rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-savings/12 text-savings-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">AI Assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              {!aiEnabled
                ? "AI is turned off in Settings"
                : statusLoading && !status
                  ? "Checking local AI…"
                  : status?.available
                    ? `${status.providerLabel}${status.selectedModel ? ` · ${status.selectedModel}` : ""} · answering about ${formatMonthLabel(month)}`
                    : status?.isLocal
                      ? "Local AI is unavailable. Start Ollama to enable the assistant."
                      : (status?.message ?? "AI provider unavailable")}
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={busy}>
              <Trash data-icon="inline-start" aria-hidden />
              Clear
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Conversation">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-8 text-center">
              <Bot className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Ask about your money</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Numerical answers are computed by the app from your transactions; the model explains them. Try a suggestion on the right.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
              {message.role === "assistant" && (
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="size-4" aria-hidden />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : message.error
                      ? "rounded-bl-md bg-destructive/10 text-destructive"
                      : "rounded-bl-md bg-muted",
                )}
              >
                {message.content}
                {message.streaming && !message.content && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" aria-hidden />
                    Thinking…
                  </span>
                )}
                {message.role === "assistant" && message.computed && !message.streaming && !message.error && (
                  <span className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calculator className="size-3" aria-hidden />
                    Figures computed by the app{message.intent ? ` (${message.intent.replace(/-/g, " ")})` : ""}
                  </span>
                )}
              </div>
              {message.role === "user" && (
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" aria-hidden />
                </span>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3">
          {!aiEnabled ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              AI features are turned off.
              <Link href="/settings?tab=ai" className="inline-flex items-center gap-1 underline underline-offset-2">
                Enable in Settings <ArrowRight className="size-3" aria-hidden />
              </Link>
            </p>
          ) : status && !status.available ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <WifiOff className="size-4" aria-hidden />
              <span>{status.isLocal ? "Start Ollama, then check again." : (status.message ?? "AI provider unavailable.")}</span>
              <Button size="xs" variant="outline" onClick={() => refresh()} disabled={statusLoading} type="button">
                <RefreshCw data-icon="inline-start" className={cn(statusLoading && "animate-spin")} aria-hidden />
                Check again
              </Button>
              <Button size="xs" variant="ghost" render={<Link href="/settings?tab=ai" />}>
                AI settings
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                placeholder="Ask about your spending, savings or income…"
                aria-label="Message"
                rows={1}
                className="min-h-10 max-h-40 resize-none"
                disabled={busy || !available}
              />
              {busy ? (
                <Button type="button" variant="outline" onClick={stop}>
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim() || !available} aria-label="Send">
                  <Send aria-hidden />
                </Button>
              )}
            </div>
          )}
        </form>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested questions</p>
          <ul className="space-y-1">
            {SUGGESTED_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => void ask(question)}
                  disabled={busy || !available}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">How answers are produced</p>
          The app first calculates the relevant numbers (totals, categories, comparisons) from your database. The model receives only those finished
          figures and writes the explanation. It never does the arithmetic itself.
        </div>
      </aside>
    </div>
  );
}
