import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;
export const SUPPORTED_LOCALES = ["en-IN", "en-US", "en-GB", "hi-IN"] as const;
export const DATE_FORMATS = ["dd MMM yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "d MMMM yyyy"] as const;

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const settingsUpdateSchema = z
  .object({
    currency: z.enum(SUPPORTED_CURRENCIES),
    locale: z.enum(SUPPORTED_LOCALES),
    dateFormat: z.enum(DATE_FORMATS),
    firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
    timeZone: z.string().trim().min(1).refine(isValidTimeZone, "Unknown time zone"),
  })
  .partial();

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
