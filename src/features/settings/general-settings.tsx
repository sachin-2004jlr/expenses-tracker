"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIsoDate } from "@/lib/dates";
import { DATE_FORMATS, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from "@/lib/validation/settings";
import type { AppSettings } from "@/types";
import { updateSettingsAction } from "./actions";

const CURRENCY_LABELS: Record<(typeof SUPPORTED_CURRENCIES)[number], string> = {
  INR: "₹ Indian Rupee (INR)",
  USD: "$ US Dollar (USD)",
  EUR: "€ Euro (EUR)",
  GBP: "£ British Pound (GBP)",
  AED: "AED UAE Dirham",
  SGD: "S$ Singapore Dollar (SGD)",
};

const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  "en-IN": "English (India) · 1,24,500",
  "en-US": "English (US) · 124,500",
  "en-GB": "English (UK) · 124,500",
  "hi-IN": "Hindi (India) · 1,24,500",
};

export function GeneralSettings({ settings, today }: { settings: AppSettings; today: string }) {
  const [form, setForm] = useState({
    currency: settings.currency,
    locale: settings.locale,
    dateFormat: settings.dateFormat,
    firstDayOfWeek: settings.firstDayOfWeek,
    timeZone: settings.timeZone,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const result = await updateSettingsAction({
      currency: form.currency as AppSettings["currency"] as (typeof SUPPORTED_CURRENCIES)[number],
      locale: form.locale as (typeof SUPPORTED_LOCALES)[number],
      dateFormat: form.dateFormat as (typeof DATE_FORMATS)[number],
      firstDayOfWeek: form.firstDayOfWeek,
      timeZone: form.timeZone,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Could not save settings", { description: result.error });
      return;
    }
    toast.success("Settings saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Currency, number formatting and calendar preferences.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="set-currency">Currency</Label>
          <Select
            value={form.currency}
            onValueChange={(value) => setForm((f) => ({ ...f, currency: value ?? f.currency }))}
            items={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABELS[c] }))}
          >
            <SelectTrigger id="set-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Amounts are stored as integer minor units; changing currency only affects the symbol shown.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-locale">Number locale</Label>
          <Select
            value={form.locale}
            onValueChange={(value) => setForm((f) => ({ ...f, locale: value ?? f.locale }))}
            items={SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
          >
            <SelectTrigger id="set-locale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-date-format">Date format</Label>
          <Select
            value={form.dateFormat}
            onValueChange={(value) => setForm((f) => ({ ...f, dateFormat: value ?? f.dateFormat }))}
            items={DATE_FORMATS.map((d) => ({ value: d, label: `${formatIsoDate(today, d)} (${d})` }))}
          >
            <SelectTrigger id="set-date-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((d) => (
                <SelectItem key={d} value={d}>
                  {formatIsoDate(today, d)} <span className="text-muted-foreground">({d})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-first-day">First day of week</Label>
          <Select
            value={String(form.firstDayOfWeek)}
            onValueChange={(value) => setForm((f) => ({ ...f, firstDayOfWeek: value === "0" ? 0 : 1 }))}
            items={[
              { value: "1", label: "Monday" },
              { value: "0", label: "Sunday" },
            ]}
          >
            <SelectTrigger id="set-first-day" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="0">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="set-timezone">Time zone</Label>
          <Input
            id="set-timezone"
            value={form.timeZone}
            onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
            list="timezone-suggestions"
            placeholder="Asia/Kolkata"
          />
          <datalist id="timezone-suggestions">
            {["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"].map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">Used to decide what &ldquo;today&rdquo; and &ldquo;this month&rdquo; mean, even when the server runs in UTC.</p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}
