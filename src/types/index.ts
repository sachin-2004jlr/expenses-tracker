/**
 * Shared domain types used across the UI, services and API.
 * Money values are integer paise unless a name ends in `Rupees`.
 */

/** Monthly tracker transactions. Savings live in their own module (see SavingsEntry). */
export type TransactionType = "INCOME" | "EXPENSE";
/** Categories serve the monthly tracker (INCOME / EXPENSE) and the savings module (SAVINGS). */
export type CategoryType = TransactionType | "SAVINGS";
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;
/** Month key, YYYY-MM. */
export type MonthKey = string;

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface CategoryWithStats extends Category {
  transactionCount: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Integer paise, always positive. */
  amount: number;
  currency: string;
  description: string;
  categoryId: string;
  category: Category;
  date: IsoDate;
  notes: string | null;
  tags: Tag[];
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape needed by the pure financial calculations. */
export interface TransactionLike {
  type: TransactionType;
  amount: number;
  date: IsoDate;
  categoryId?: string;
  description?: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId: string;
  category: Category;
  notes: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: IsoDate;
  endDate: IsoDate | null;
  nextRunDate: IsoDate;
  lastRunDate: IsoDate | null;
  isActive: boolean;
}

export interface AppSettings {
  currency: string;
  locale: string;
  dateFormat: string;
  firstDayOfWeek: 0 | 1;
  timeZone: string;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface MonthTotals {
  month: MonthKey;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number | null;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  /** Percentage of the total for the type, 0-100 with one decimal. */
  percentage: number;
}

export interface MetricComparison {
  current: number;
  previous: number;
  /** Absolute difference (current - previous) in paise. */
  delta: number;
  /** Percentage change vs previous, null when previous is 0. */
  changePercent: number | null;
}

export interface CategoryChange {
  categoryId: string;
  name: string;
  current: number;
  previous: number;
  delta: number;
  changePercent: number | null;
}

export interface MonthlyComparison {
  currentMonth: MonthKey;
  previousMonth: MonthKey;
  income: MetricComparison;
  expenses: MetricComparison;
  savings: MetricComparison;
  categories: CategoryChange[];
}

export type RangePreset = "3m" | "6m" | "12m" | "all";

/** Monthly spending limit for one expense category, in paise. */
export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
}

export type BudgetStatus = "ok" | "warning" | "over";

export interface BudgetProgress {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
  /** budget - spent; negative when over budget. */
  remaining: number;
  /** spent / budget as a percentage with one decimal (can exceed 100). */
  percentage: number;
  status: BudgetStatus;
}

export interface BudgetSummary {
  items: BudgetProgress[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentage: number;
  status: BudgetStatus;
  overCount: number;
}

export interface DailyBalancePoint {
  date: IsoDate;
  /** Running balance at the end of this day (all-time). */
  balance: number;
  income: number;
  expenses: number;
}

export interface DashboardSummary {
  month: MonthKey;
  /**
   * Income minus expenses in the selected month only. Every month starts from ₹0: leftovers
   * from earlier months are not carried in (they belong in the separate savings module).
   */
  monthBalance: number;
  /** Day-by-day running balance through the selected month, starting from ₹0 on the 1st. */
  dailyBalance: DailyBalancePoint[];
  current: MonthTotals;
  previous: MonthTotals;
  comparison: MonthlyComparison;
  expenseCategories: CategoryBreakdownItem[];
  incomeCategories: CategoryBreakdownItem[];
  largestExpenses: Transaction[];
  recentTransactions: Transaction[];
  series: MonthTotals[];
}

export interface AnalyticsOverview {
  range: RangePreset;
  months: MonthKey[];
  series: MonthTotals[];
  totals: { income: number; expenses: number; savings: number; savingsRate: number | null };
  averages: { income: number; expenses: number; savings: number };
  expenseCategories: CategoryBreakdownItem[];
  incomeCategories: CategoryBreakdownItem[];
  largestExpenses: Transaction[];
  comparison: MonthlyComparison;
  bestMonth: MonthTotals | null;
  worstMonth: MonthTotals | null;
}

// ---------------------------------------------------------------------------
// Savings module (separate from the monthly tracker)
// ---------------------------------------------------------------------------

/**
 * DEPOSIT adds money to your savings; SPEND records what you did with savings money
 * (bought gold, put it in an FD, paid for a trip). Neither touches the monthly tracker.
 */
export type SavingsEntryKind = "DEPOSIT" | "SPEND";

export interface SavingsEntry {
  id: string;
  kind: SavingsEntryKind;
  /** Integer paise, always positive; `kind` carries the direction. */
  amount: number;
  description: string;
  /** What it was for (SPEND) or what it is earmarked for (DEPOSIT, optional). */
  categoryId: string | null;
  category: Category | null;
  date: IsoDate;
  /** Journal note linked to this entry, if any. */
  journal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsMonth {
  month: MonthKey;
  added: number;
  used: number;
  /** added − used */
  net: number;
  /** Savings balance at the end of the month (all time). */
  balance: number;
  entryCount: number;
}

/** A notepad entry about what was done with savings. Optionally linked to one savings entry. */
export interface SavingsNote {
  id: string;
  title: string;
  body: string;
  date: IsoDate;
  pinned: boolean;
  entryId: string | null;
  /** Snapshot of the linked entry for display (null when unlinked or the entry was deleted). */
  entry: Pick<SavingsEntry, "id" | "kind" | "amount" | "description" | "date" | "category"> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  /** Integer paise, > 0. */
  targetAmount: number;
  targetDate: IsoDate | null;
  /** Optional savings category: money added to savings earmarked for it counts towards the goal. */
  categoryId: string | null;
  color: string;
  archived: boolean;
}

export interface SavingsGoalProgress extends SavingsGoal {
  /** Earmarked deposits for a linked goal, otherwise the whole savings balance. */
  saved: number;
  remaining: number;
  percentage: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  complete: boolean;
  categoryName: string | null;
}

export interface SavingsOverview {
  month: MonthKey;
  /** All-time money added minus money used. */
  balance: number;
  addedAllTime: number;
  usedAllTime: number;
  addedThisMonth: number;
  usedThisMonth: number;
  addedLastMonth: number;
  usedLastMonth: number;
  series: SavingsMonth[];
  /** What savings were used for, all time and in the selected month. */
  usedByCategory: CategoryBreakdownItem[];
  usedByCategoryThisMonth: CategoryBreakdownItem[];
  goals: SavingsGoalProgress[];
  recentEntries: SavingsEntry[];
  /** Recent entries (90 days) without a journal note. */
  entriesWithoutNotes: SavingsEntry[];
  noteCount: number;
}
