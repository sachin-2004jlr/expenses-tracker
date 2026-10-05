import type { TransactionType } from "@/types";

/** Display metadata for each transaction type, shared by every screen so wording and colours match. */
export interface TransactionTypeMeta {
  value: TransactionType;
  label: string;
  /** "Add income", "Add expense", "Add savings" */
  addLabel: string;
  /** Verb for activity lists: "Received", "Spent", "Saved". */
  verb: string;
  categoryLabel: string;
  textClass: string;
  activeToggleClass: string;
  badgeClass: string;
  buttonClass: string;
}

export const TRANSACTION_TYPES: TransactionTypeMeta[] = [
  {
    value: "INCOME",
    label: "Income",
    addLabel: "Add income",
    verb: "Received",
    categoryLabel: "income category",
    textClass: "text-income-foreground",
    activeToggleClass: "bg-background text-income-foreground shadow-sm",
    badgeClass: "border-income/40 text-income-foreground",
    buttonClass: "bg-income text-white hover:bg-income/90",
  },
  {
    value: "EXPENSE",
    label: "Expense",
    addLabel: "Add expense",
    verb: "Spent",
    categoryLabel: "expense category",
    textClass: "text-expense-foreground",
    activeToggleClass: "bg-background text-expense-foreground shadow-sm",
    badgeClass: "border-expense/40 text-expense-foreground",
    buttonClass: "bg-expense text-white hover:bg-expense/90",
  },
  {
    value: "SAVINGS",
    label: "Savings",
    addLabel: "Add savings",
    verb: "Saved",
    categoryLabel: "savings destination",
    textClass: "text-saved-foreground",
    activeToggleClass: "bg-background text-saved-foreground shadow-sm",
    badgeClass: "border-saved/40 text-saved-foreground",
    buttonClass: "bg-saved text-white hover:bg-saved/90",
  },
];

const BY_TYPE = new Map(TRANSACTION_TYPES.map((meta) => [meta.value, meta]));

export function typeMeta(type: TransactionType): TransactionTypeMeta {
  return BY_TYPE.get(type) ?? TRANSACTION_TYPES[1]!;
}
