"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, Eraser, FileSpreadsheet, FileUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { clearDataAction } from "./actions";

interface DryRunResult {
  transactions: number;
  categories: number;
  recurring: number;
}

interface ApiErrorBody {
  error?: { message?: string; details?: { path: string; message: string }[] };
}

export function DataManagement({ transactionCount }: { transactionCount: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<unknown>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<DryRunResult | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[] | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [importing, setImporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [resetCategories, setResetCategories] = useState(false);

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setIssues(null);
    setBackup(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setIssues([{ path: "(file)", message: "The file is not valid JSON." }]);
      return;
    }
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true, backup: parsed }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      setIssues(body.error?.details?.length ? body.error.details : [{ path: "(file)", message: body.error?.message ?? "Invalid backup" }]);
      return;
    }
    setBackup(parsed);
    setPreview((await response.json()) as DryRunResult);
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, backup }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody & { transactionsImported?: number; categoriesCreated?: number };
      if (!response.ok) throw new Error(body.error?.message ?? "Import failed");
      toast.success("Import complete", {
        description: `${body.transactionsImported ?? 0} transactions imported, ${body.categoriesCreated ?? 0} categories created.`,
      });
      setBackup(null);
      setPreview(null);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (error) {
      toast.error("Import failed", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setImporting(false);
    }
  };

  const clear = async () => {
    const result = await clearDataAction({ resetCategories });
    if (!result.ok) {
      toast.error("Could not clear data", { description: result.error });
      return;
    }
    toast.success("Data cleared", { description: `${result.data.transactions} transactions removed.` });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download everything you have tracked. JSON backups can be imported again; CSV opens in any spreadsheet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<a href="/api/export?format=json" download />}>
            <Download data-icon="inline-start" aria-hidden />
            Export JSON backup
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="/api/export?format=csv" download />}>
            <FileSpreadsheet data-icon="inline-start" aria-hidden />
            Export CSV
          </Button>
          <p className="basis-full text-xs text-muted-foreground">{transactionCount} transactions currently stored.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import</CardTitle>
          <CardDescription>Restore a JSON backup. Every row is validated before anything is written; a malformed file is rejected entirely.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="import-file" className="text-sm font-medium">
              Backup file (.json)
            </label>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            />
          </div>

          {issues && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-sm" role="alert">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <TriangleAlert className="size-4" aria-hidden />
                {fileName ?? "File"} was rejected
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">
                {issues.slice(0, 10).map((issue, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{issue.path}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview && (
            <div className="grid gap-3 rounded-lg border border-border p-3 text-sm">
              <p>
                <strong>{fileName}</strong> looks valid: {preview.transactions} transactions, {preview.categories} categories, {preview.recurring} recurring rules.
              </p>
              <div role="radiogroup" aria-label="Import mode" className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: "merge", title: "Merge", text: "Add the backup to what is already here." },
                    { value: "replace", title: "Replace", text: "Delete existing transactions, tags and recurring rules first." },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === option.value}
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      mode === option.value ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="block font-medium">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.text}</span>
                  </button>
                ))}
              </div>
              <div>
                <Button onClick={() => setConfirmImport(true)} disabled={importing}>
                  <FileUp data-icon="inline-start" aria-hidden />
                  {importing ? "Importing…" : `Import (${mode})`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="ring-destructive/25">
        <CardHeader>
          <CardTitle className="text-destructive">Clear data</CardTitle>
          <CardDescription>Delete all transactions, tags, recurring rules and savings notes. Export a backup first.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={resetCategories} onCheckedChange={(checked) => setResetCategories(Boolean(checked))} />
            Also reset categories to the defaults
          </label>
          <Button variant="destructive" onClick={() => setConfirmClear(true)}>
            <Eraser data-icon="inline-start" aria-hidden />
            Clear all data
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        title={mode === "replace" ? "Replace all existing data?" : "Import backup?"}
        description={
          mode === "replace"
            ? `All ${transactionCount} existing transactions will be deleted and replaced by the backup. This cannot be undone.`
            : `${preview?.transactions ?? 0} transactions will be added to your existing data.`
        }
        confirmLabel={mode === "replace" ? "Replace" : "Import"}
        destructive={mode === "replace"}
        typeToConfirm={mode === "replace" ? "REPLACE" : undefined}
        onConfirm={runImport}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Delete all financial data?"
        description={`${transactionCount} transactions will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete everything"
        destructive
        typeToConfirm="DELETE"
        onConfirm={clear}
      />
    </div>
  );
}
