import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Database schema (PostgreSQL dialect, works on PGlite locally and Postgres in production).
 *
 * Every domain table carries a `userId` so multi-user authentication can be layered on
 * later without a schema rewrite. Today a single default user is created on first run.
 *
 * Money is stored as integer paise (1 rupee = 100 paise) in `bigint` columns, never floats.
 */

export const transactionTypeEnum = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);
export const insightKindEnum = pgEnum("insight_kind", ["MONTHLY", "SPENDING", "COMPARISON"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  name: text("name"),
  ...timestamps,
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    icon: text("icon").notNull().default("tag"),
    color: text("color").notNull().default("slate"),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_user_type_name_idx").on(t.userId, t.type, t.name),
    index("categories_user_idx").on(t.userId),
  ],
);

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    notes: text("notes"),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    /** Every N units of `frequency` (e.g. every 2 weeks). */
    interval: integer("interval").notNull().default(1),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    /** Next date on which a transaction should be materialised. */
    nextRunDate: date("next_run_date", { mode: "string" }).notNull(),
    lastRunDate: date("last_run_date", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("recurring_user_next_run_idx").on(t.userId, t.nextRunDate)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    /** Amount in integer paise. Always positive; `type` carries the sign. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** Calendar date (YYYY-MM-DD) with no time component, so there is no timezone drift. */
    date: date("date", { mode: "string" }).notNull(),
    notes: text("notes"),
    recurringId: uuid("recurring_id").references(() => recurringTransactions.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
    index("transactions_user_type_idx").on(t.userId, t.type),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("tags_user_name_idx").on(t.userId, t.name)],
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("transaction_tags_tag_idx").on(t.tagId),
  ],
);

export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: insightKindEnum("kind").notNull(),
    /** Month the insight is about (YYYY-MM). */
    monthKey: text("month_key").notNull(),
    /** Hash of the deterministic facts the insight was generated from, used for cache validation. */
    dataHash: text("data_hash").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    content: jsonb("content").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("ai_insights_user_kind_month_idx").on(t.userId, t.kind, t.monthKey)],
);

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("INR"),
  locale: text("locale").notNull().default("en-IN"),
  dateFormat: text("date_format").notNull().default("dd MMM yyyy"),
  /** 0 = Sunday, 1 = Monday */
  firstDayOfWeek: integer("first_day_of_week").notNull().default(1),
  timeZone: text("time_zone").notNull().default("Asia/Kolkata"),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  aiProvider: text("ai_provider").notNull().default("ollama"),
  ollamaUrl: text("ollama_url").notNull().default("http://localhost:11434"),
  ollamaModel: text("ollama_model"),
  /** Automatically refresh the monthly AI summary when the underlying data changes. */
  aiAutoAnalyze: boolean("ai_auto_analyze").notNull().default(false),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Relations (for drizzle relational queries)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  categories: many(categories),
  transactions: many(transactions),
  tags: many(tags),
  settings: one(appSettings, { fields: [users.id], references: [appSettings.userId] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
  transactionTags: many(transactionTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, { fields: [transactionTags.tagId], references: [tags.id] }),
}));

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one, many }) => ({
  user: one(users, { fields: [recurringTransactions.userId], references: [users.id] }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(users, { fields: [aiInsights.userId], references: [users.id] }),
}));

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  user: one(users, { fields: [appSettings.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type UserRow = typeof users.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type TagRow = typeof tags.$inferSelect;
export type RecurringTransactionRow = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransactionRow = typeof recurringTransactions.$inferInsert;
export type AiInsightRow = typeof aiInsights.$inferSelect;
export type AppSettingsRow = typeof appSettings.$inferSelect;
