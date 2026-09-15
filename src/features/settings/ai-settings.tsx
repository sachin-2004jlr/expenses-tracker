"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PROVIDER_LABELS } from "@/lib/ai/registry";
import { cn } from "@/lib/utils";
import type { AiStatus, AppSettings } from "@/types";
import { testOllamaAction, updateSettingsAction } from "./actions";

const AUTO = "__auto";

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

export function AiSettings({ settings, initialStatus }: { settings: AppSettings; initialStatus: AiStatus | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    aiEnabled: settings.aiEnabled,
    aiProvider: settings.aiProvider,
    ollamaUrl: settings.ollamaUrl,
    ollamaModel: settings.ollamaModel ?? AUTO,
    aiAutoAnalyze: settings.aiAutoAnalyze,
  });
  const [status, setStatus] = useState<AiStatus | null>(initialStatus);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const models = status?.models ?? [];
  const modelItems = [
    { value: AUTO, label: status?.selectedModel && form.ollamaModel === AUTO ? `Auto (${status.selectedModel})` : "Auto-select installed model" },
    ...models.map((m) => ({ value: m.name, label: m.name })),
    ...(form.ollamaModel !== AUTO && !models.some((m) => m.name === form.ollamaModel) ? [{ value: form.ollamaModel, label: `${form.ollamaModel} (not installed)` }] : []),
  ];

  const test = async () => {
    setTesting(true);
    const result = await testOllamaAction(form.ollamaUrl, form.ollamaModel === AUTO ? null : form.ollamaModel);
    setTesting(false);
    if (!result.ok) {
      toast.error("Could not test connection", { description: result.error });
      return;
    }
    setStatus(result.data);
    if (result.data.available) toast.success("Ollama is reachable", { description: `${result.data.models.length} models found · using ${result.data.selectedModel}` });
    else toast.warning("Ollama not available", { description: result.data.message ?? undefined });
  };

  const save = async () => {
    setSaving(true);
    const result = await updateSettingsAction({
      aiEnabled: form.aiEnabled,
      aiProvider: form.aiProvider,
      ollamaUrl: form.ollamaUrl,
      ollamaModel: form.ollamaModel === AUTO ? null : form.ollamaModel,
      aiAutoAnalyze: form.aiAutoAnalyze,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Could not save AI settings", { description: result.error });
      return;
    }
    toast.success("AI settings saved");
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
          <CardDescription>Ollama runs on your machine and is the default provider. Core finance features never depend on AI.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Enable AI features</span>
              <span className="block text-xs text-muted-foreground">Dashboard summary, spending analysis and the assistant.</span>
            </span>
            <Switch checked={form.aiEnabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, aiEnabled: checked }))} aria-label="Enable AI features" />
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="ai-provider">Provider</Label>
            <Select
              value={form.aiProvider}
              onValueChange={(value) => setForm((f) => ({ ...f, aiProvider: (value as AppSettings["aiProvider"]) ?? f.aiProvider }))}
              items={(Object.keys(PROVIDER_LABELS) as AppSettings["aiProvider"][]).map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
            >
              <SelectTrigger id="ai-provider" className="w-full sm:w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as AppSettings["aiProvider"][]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.aiProvider === "openai-compatible" && (
              <p className="text-xs text-muted-foreground">
                Configured only through server environment variables (OPENAI_COMPATIBLE_BASE_URL, _API_KEY, _MODEL) so keys never reach the browser.
                Your calculated financial facts are sent to that endpoint.
              </p>
            )}
          </div>

          {form.aiProvider === "ollama" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="ollama-url">Ollama URL</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="ollama-url" value={form.ollamaUrl} onChange={(e) => setForm((f) => ({ ...f, ollamaUrl: e.target.value }))} placeholder="http://localhost:11434" className="sm:max-w-sm" />
                  <Button variant="outline" onClick={test} disabled={testing} type="button">
                    <RefreshCw data-icon="inline-start" className={cn(testing && "animate-spin")} aria-hidden />
                    Test Ollama connection
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="ollama-model">Model</Label>
                <Select value={form.ollamaModel} onValueChange={(value) => setForm((f) => ({ ...f, ollamaModel: value ?? AUTO }))} items={modelItems}>
                  <SelectTrigger id="ollama-model" className="w-full sm:w-96">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelItems.map((item) => {
                      const info = models.find((m) => m.name === item.value);
                      return (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                          {info && (
                            <span className="text-xs text-muted-foreground">
                              {[info.parameterSize, formatSize(info.sizeBytes)].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Models are detected from your Ollama install (<code className="font-mono">ollama list</code>). Smaller models answer faster; larger ones write better summaries.
                </p>
              </div>

              {status && (
                <div
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-3 text-sm",
                    status.available ? "border-income/30 bg-income/8" : "border-amber-500/30 bg-amber-500/8",
                  )}
                  role="status"
                >
                  {status.available ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-income-foreground" aria-hidden /> : <WifiOff className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {status.available
                        ? status.endpoint
                          ? `Connected to ${status.endpoint}`
                          : `${status.providerLabel} is ready`
                        : `Not connected${status.endpoint ? ` (${status.endpoint})` : ""}`}
                    </p>
                    <p className="text-muted-foreground">
                      {status.available
                        ? `${status.models.length} model${status.models.length === 1 ? "" : "s"} installed · will use ${status.selectedModel}`
                        : (status.message ?? "Start Ollama and test again.")}
                    </p>
                    {status.available && status.message && <p className="text-muted-foreground">{status.message}</p>}
                  </div>
                </div>
              )}
            </>
          )}

          <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Auto-analyze after changes</span>
              <span className="block text-xs text-muted-foreground">Refresh the dashboard summary automatically when the month&apos;s data changes. Off by default to avoid extra model calls.</span>
            </span>
            <Switch checked={form.aiAutoAnalyze} onCheckedChange={(checked) => setForm((f) => ({ ...f, aiAutoAnalyze: checked }))} aria-label="Auto-analyze after changes" />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save AI settings"}
          </Button>
        </CardFooter>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-income-foreground" aria-hidden />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your financial data is stored in your configured database. When using local Ollama, AI requests are processed by your local Ollama instance and never leave your computer.</p>
          <p>
            A deployment on Vercel cannot reach the Ollama on your laptop. Hosted deployments need a remote provider (the OpenAI-compatible option), and all finance features keep working without any AI.
          </p>
          <p>The AI only ever receives finished figures calculated by the app; it is never the source of truth for any number you see.</p>
        </CardContent>
      </Card>
    </div>
  );
}
