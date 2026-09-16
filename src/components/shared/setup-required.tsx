import { KeyRound } from "lucide-react";

export function SetupRequired({ title, message, steps }: { title: string; message: string; steps: string[] }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-card-foreground">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">
          <KeyRound className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
