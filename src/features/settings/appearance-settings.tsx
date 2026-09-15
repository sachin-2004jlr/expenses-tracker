"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AppearanceSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose light, dark or follow your system. The preference is saved in this browser.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ThemeToggle size="md" />
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="rounded-lg border border-border p-3">
            <span className="block font-medium text-foreground">Light</span>
            Bright surfaces, ideal in daylight.
          </li>
          <li className="rounded-lg border border-border p-3">
            <span className="block font-medium text-foreground">Dark</span>
            Dimmed surfaces with the same colour semantics.
          </li>
          <li className="rounded-lg border border-border p-3">
            <span className="block font-medium text-foreground">System</span>
            Matches your operating system automatically (default).
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
