import { randomUUID } from "node:crypto";
import type { RecurrenceFrequency, TransactionType } from "@/types";

/**
 * MongoDB document shapes and collection names.
 *
 * - Every document uses a UUID string as `_id`, so ids stay stable and URL-safe and the API's
 *   uuid validation keeps working.
 * - Every domain document carries a `userId`; accounts are fully isolated.
 * - Money is stored as integer paise (1 rupee = 100 paise); never floats.
 * - Calendar dates are `YYYY-MM-DD` strings, which sort and range-compare correctly as text.
 * - Tags are embedded in each transaction as lowercase strings (no join collection needed).
 */

export const COLLECTIONS = {
  users: "users",
  categories: "categories",
  transactions: "transactions",
  recurring: "recurring_transactions",
  settings: "app_settings",
} as const;

export function newId(): string {
  return randomUUID();
}

interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDoc extends Timestamps {
  _id: string;
  email: string;
  name: string | null;
  image: string | null;
  /** scrypt hash (see lib/password.ts). Null = cannot sign in. */
  passwordHash: string | null;
}

export interface CategoryDoc extends Timestamps {
  _id: string;
  userId: string;
  name: string;
  /** Lower-cased copy of `name` for the unique index / case-insensitive matching. */
  nameLower: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface TransactionDoc extends Timestamps {
  _id: string;
  userId: string;
  type: TransactionType;
  /** Integer paise, always positive; `type` carries the sign. */
  amount: number;
  currency: string;
  description: string;
  categoryId: string;
  /** YYYY-MM-DD */
  date: string;
  notes: string | null;
  tags: string[];
  recurringId: string | null;
}

export interface RecurringDoc extends Timestamps {
  _id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId: string;
  notes: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunDate: string | null;
  isActive: boolean;
}

export interface AppSettingsDoc extends Timestamps {
  _id: string;
  userId: string;
  currency: string;
  locale: string;
  dateFormat: string;
  firstDayOfWeek: number;
  timeZone: string;
}
