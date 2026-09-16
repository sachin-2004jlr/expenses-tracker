/**
 * Shared domain types used across the UI, services and API.
 * Money values are integer paise unless a name ends in `Rupees`.
 */

export type TransactionType = "INCOME" | "EXPENSE";
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type InsightKind = "MONTHLY" | "SPENDING" | "COMPARISON";

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
  aiEnabled: boolean;
  aiProvider: "ollama" | "openai-compatible" | "mock";
  ollamaUrl: string;
  ollamaModel: string | null;
  aiAutoAnalyze: boolean;
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
  /** Balance at the start of the selected month. */
  openingBalance: number;
  /** Day-by-day running balance through the selected month. */
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
// AI
// ---------------------------------------------------------------------------

export type FinancialHealth = "excellent" | "good" | "fair" | "concerning" | "unknown";

export interface AiInsight {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  financialHealth: FinancialHealth;
}

export interface AiInsightResult {
  kind: InsightKind;
  month: MonthKey;
  insight: AiInsight;
  provider: string;
  model: string;
  generatedAt: string;
  cached: boolean;
  /** True when the model returned unstructured text and we fell back to plain summary. */
  degraded: boolean;
}

export interface AiModelInfo {
  name: string;
  family?: string;
  parameterSize?: string;
  sizeBytes?: number;
}

export interface AiStatus {
  enabled: boolean;
  provider: string;
  providerLabel: string;
  available: boolean;
  models: AiModelInfo[];
  selectedModel: string | null;
  endpoint: string | null;
  /** Human readable reason when unavailable. */
  message: string | null;
  checkedAt: string;
  isLocal: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
