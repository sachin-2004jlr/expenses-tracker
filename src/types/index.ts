/**
 * Shared domain types used across the UI, services and API.
 * Money values are integer paise unless a name ends in `Rupees`.
 */

/**
 * INCOME and EXPENSE move the balance. SAVINGS records money you set aside (SIP, FD, emergency
 * fund...): it is neither spending nor income, so it never changes the balance or the expenses.
 */
export type TransactionType = "INCOME" | "EXPENSE" | "SAVINGS";
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;
/** Month key, YYYY-MM. */
export type MonthKey = string;

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
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
  /** Savings journal note linked to this entry (SAVINGS only), if any. */
  journal?: string | null;
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
  /** Net kept: income − expenses (may be negative). */
  savings: number;
  savingsRate: number | null;
  /** Explicitly set aside with SAVINGS entries. */
  saved: number;
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
  totalBalance: number;
  allTimeIncome: number;
  allTimeExpenses: number;
  /** All-time total of SAVINGS entries. */
  allTimeSaved: number;
  /** Balance at the start of the selected month. */
  openingBalance: number;
  /** Day-by-day running balance through the selected month. */
  dailyBalance: DailyBalancePoint[];
  current: MonthTotals;
  previous: MonthTotals;
  comparison: MonthlyComparison;
  expenseCategories: CategoryBreakdownItem[];
  incomeCategories: CategoryBreakdownItem[];
  savingsCategories: CategoryBreakdownItem[];
  largestExpenses: Transaction[];
  recentTransactions: Transaction[];
  series: MonthTotals[];
}

export interface AnalyticsOverview {
  range: RangePreset;
  months: MonthKey[];
  series: MonthTotals[];
  totals: { income: number; expenses: number; savings: number; savingsRate: number | null; saved: number };
  averages: { income: number; expenses: number; savings: number };
  expenseCategories: CategoryBreakdownItem[];
  incomeCategories: CategoryBreakdownItem[];
  savingsCategories: CategoryBreakdownItem[];
  largestExpenses: Transaction[];
  comparison: MonthlyComparison;
  bestMonth: MonthTotals | null;
  worstMonth: MonthTotals | null;
}

// ---------------------------------------------------------------------------
// Savings journal and goals
// ---------------------------------------------------------------------------

/** A notepad entry about what was done with saved money. Optionally linked to a SAVINGS entry. */
export interface SavingsNote {
  id: string;
  title: string;
  body: string;
  date: IsoDate;
  pinned: boolean;
  transactionId: string | null;
  /** Snapshot of the linked entry for display (null when unlinked or the entry was deleted). */
  transaction: Pick<Transaction, "id" | "amount" | "description" | "date" | "category"> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  /** Integer paise, > 0. */
  targetAmount: number;
  targetDate: IsoDate | null;
  /** Savings destination whose entries count towards the goal. */
  categoryId: string | null;
  color: string;
  archived: boolean;
}

export interface SavingsGoalProgress extends SavingsGoal {
  saved: number;
  remaining: number;
  /** saved / target, one decimal, capped at 100 for display by the UI. */
  percentage: number;
  /** Months left until targetDate (including the current one); null without a date. */
  monthsLeft: number | null;
  /** Even monthly amount needed to hit the target on time; null without a date. */
  monthlyNeeded: number | null;
  complete: boolean;
  categoryName: string | null;
}

export interface SavingsOverview {
  month: MonthKey;
  savedThisMonth: number;
  savedLastMonth: number;
  savedAllTime: number;
  /** Net kept this month (income − expenses). */
  keptThisMonth: number;
  /** Kept but not yet assigned with a SAVINGS entry (may be negative). */
  unallocatedThisMonth: number;
  savingsRate: number | null;
  destinations: CategoryBreakdownItem[];
  series: MonthTotals[];
  goals: SavingsGoalProgress[];
  recentEntries: Transaction[];
  /** SAVINGS entries in the last 90 days without a journal note. */
  entriesWithoutNotes: Transaction[];
  noteCount: number;
}
