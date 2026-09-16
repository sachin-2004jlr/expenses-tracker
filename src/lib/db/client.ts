import { MongoClient, type Collection, type Db as MongoDatabase } from "mongodb";
import { DatabaseUnavailableError } from "./errors";
import {
  COLLECTIONS,
  type AiInsightDoc,
  type AppSettingsDoc,
  type CategoryDoc,
  type RecurringDoc,
  type TransactionDoc,
  type UserDoc,
} from "./schema";

/**
 * MongoDB access.
 *
 * - `DATABASE_URL` (or `MONGODB_URI`): any MongoDB connection string, e.g.
 *   `mongodb://127.0.0.1:27017/expenses_tracker` locally or an Atlas `mongodb+srv://...` URI
 *   in production. When unset, the local server on 127.0.0.1:27017 is used.
 * - `memory://` starts an in-memory MongoDB (mongodb-memory-server) for tests.
 *
 * The client is memoised on `globalThis` so hot reloads do not open new connection pools, and
 * indexes are created once per process on first use (MongoDB has no schema migrations).
 */

export const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/expenses_tracker";
export const DEFAULT_DB_NAME = "expenses_tracker";

export interface Db {
  client: MongoClient;
  database: MongoDatabase;
  users: Collection<UserDoc>;
  categories: Collection<CategoryDoc>;
  transactions: Collection<TransactionDoc>;
  recurring: Collection<RecurringDoc>;
  insights: Collection<AiInsightDoc>;
  settings: Collection<AppSettingsDoc>;
}

export type DbKind = "mongodb" | "memory";

type DbGlobals = {
  __expensesMongo?: Promise<Db>;
};

const globals = globalThis as unknown as DbGlobals;

export function getDatabaseUri(): string {
  return process.env.DATABASE_URL || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
}

export function getDbKind(): DbKind {
  return getDatabaseUri() === "memory://" ? "memory" : "mongodb";
}

export function getDb(): Promise<Db> {
  if (!globals.__expensesMongo) {
    globals.__expensesMongo = initialise().catch((error: unknown) => {
      // Allow a retry on the next request instead of caching a failed connection forever.
      globals.__expensesMongo = undefined;
      throw error;
    });
  }
  return globals.__expensesMongo;
}

function databaseNameFrom(uri: string): string {
  try {
    const path = new URL(uri).pathname.replace(/^\/+/, "");
    return path || DEFAULT_DB_NAME;
  } catch {
    return DEFAULT_DB_NAME;
  }
}

async function resolveUri(): Promise<string> {
  const configured = getDatabaseUri();
  if (configured !== "memory://") return configured;
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create({ instance: { dbName: "expenses_e2e" } });
  return `${server.getUri()}expenses_e2e`;
}

async function initialise(): Promise<Db> {
  if (!process.env.DATABASE_URL && !process.env.MONGODB_URI && process.env.VERCEL) {
    throw new DatabaseUnavailableError(
      "not-configured",
      "DATABASE_URL is not set. Add a MongoDB connection string (for example a MongoDB Atlas URI) to your Vercel environment variables.",
    );
  }

  const uri = await resolveUri();
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
    maxPoolSize: 10,
  });
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
  } catch (error) {
    await client.close().catch(() => undefined);
    const hint =
      getDatabaseUri() === DEFAULT_MONGODB_URI
        ? " No DATABASE_URL is set, so the app tried the local MongoDB on 127.0.0.1:27017. Install and start MongoDB Community Server, or set DATABASE_URL."
        : "";
    throw new DatabaseUnavailableError("connection-failed", `Could not connect to MongoDB.${hint}`, error);
  }

  const database = client.db(databaseNameFrom(uri));
  const db: Db = {
    client,
    database,
    users: database.collection<UserDoc>(COLLECTIONS.users),
    categories: database.collection<CategoryDoc>(COLLECTIONS.categories),
    transactions: database.collection<TransactionDoc>(COLLECTIONS.transactions),
    recurring: database.collection<RecurringDoc>(COLLECTIONS.recurring),
    insights: database.collection<AiInsightDoc>(COLLECTIONS.insights),
    settings: database.collection<AppSettingsDoc>(COLLECTIONS.settings),
  };
  await ensureIndexes(db);
  return db;
}

/** Create the indexes the services rely on. Idempotent; safe to run on every start. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.users.createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    db.categories.createIndex({ userId: 1, type: 1, nameLower: 1 }, { unique: true, name: "categories_user_type_name_unique" }),
    db.categories.createIndex({ userId: 1, sortOrder: 1 }, { name: "categories_user_sort" }),
    db.transactions.createIndex({ userId: 1, date: -1, createdAt: -1 }, { name: "transactions_user_date" }),
    db.transactions.createIndex({ userId: 1, categoryId: 1 }, { name: "transactions_user_category" }),
    db.transactions.createIndex({ userId: 1, type: 1, date: 1 }, { name: "transactions_user_type_date" }),
    db.transactions.createIndex({ userId: 1, tags: 1 }, { name: "transactions_user_tags" }),
    db.transactions.createIndex({ userId: 1, recurringId: 1 }, { name: "transactions_user_recurring", sparse: true }),
    db.recurring.createIndex({ userId: 1, nextRunDate: 1 }, { name: "recurring_user_next_run" }),
    db.insights.createIndex({ userId: 1, kind: 1, monthKey: 1 }, { unique: true, name: "insights_user_kind_month_unique" }),
    db.settings.createIndex({ userId: 1 }, { unique: true, name: "settings_user_unique" }),
  ]);
}
