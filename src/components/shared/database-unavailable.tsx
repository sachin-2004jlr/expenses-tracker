import { Database } from "lucide-react";

export function DatabaseUnavailable({ kind, message }: { kind: "not-configured" | "connection-failed"; message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-card-foreground">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Database className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{kind === "not-configured" ? "Database not configured" : "Database unavailable"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 space-y-3 text-sm">
          <p className="font-medium">How to fix</p>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Locally: install and start MongoDB Community Server (it listens on{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">mongodb://127.0.0.1:27017</code>), or point{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">DATABASE_URL</code> at any MongoDB.
            </li>
            <li>
              Hosted: create a free MongoDB Atlas cluster, copy its <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">mongodb+srv://</code> connection
              string and set it as <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">DATABASE_URL</code> (Vercel → Project → Settings → Environment
              Variables), then redeploy.
            </li>
            <li>Indexes are created automatically on first connection; there are no migrations to run.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
