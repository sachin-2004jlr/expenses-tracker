import path from "node:path";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { DatabaseUnavailableError } from "./errors";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - When `DATABASE_URL` is set: PostgreSQL via node-postgres (production / Vercel).
 * - Otherwise (local development): embedded PGlite stored in `./.data/pglite`.
 *
 * Both share the same Drizzle schema and migrations, so the app behaves identically.
 * The connection is memoised on `globalThis` so hot reloads do not open new pools.
 */
export type Db = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DbKind = "postgres" | "pglite";

type DbGlobals = {
  __expensesDb?: Promise<Db>;
};

const globals = globalThis as unknown as DbGlobals;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function getDbKind(): DbKind {
  return process.env.DATABASE_URL ? "postgres" : "pglite";
}

export function getDb(): Promise<Db> {
  if (!globals.__expensesDb) {
    globals.__expensesDb = initialise().catch((error: unknown) => {
      // Allow a retry on the next request instead of caching a failed connection forever.
      globals.__expensesDb = undefined;
      throw error;
    });
  }
  return globals.__expensesDb;
}

function shouldUseSsl(connectionString: string): boolean {
  const flag = process.env.DATABASE_SSL;
  if (flag === "disable" || flag === "false" || flag === "0") return false;
  try {
    const host = new URL(connectionString).hostname;
    return !["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host);
  } catch {
    return true;
  }
}

async function initialise(): Promise<Db> {
  const connectionString = process.env.DATABASE_URL;
  const autoMigrate = process.env.DB_AUTO_MIGRATE !== "false";

  if (connectionString) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");

    const pool = new Pool({
      connectionString,
      max: 5,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });

    const db = drizzle(pool, { schema });
    try {
      if (autoMigrate) await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      await pool.query("select 1");
    } catch (error) {
      throw new DatabaseUnavailableError(
        "connection-failed",
        "Could not connect to the PostgreSQL database defined by DATABASE_URL.",
        error,
      );
    }
    return db as unknown as Db;
  }

  if (process.env.VERCEL) {
    throw new DatabaseUnavailableError(
      "not-configured",
      "DATABASE_URL is not set. Add a PostgreSQL connection string to your Vercel environment variables.",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const dataDir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), ".data", "pglite");
  if (dataDir !== "memory://") {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dataDir, { recursive: true });
  }
  const client = dataDir === "memory://" ? new PGlite() : new PGlite(dataDir);
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    throw new DatabaseUnavailableError(
      "connection-failed",
      `Could not open the local PGlite database at ${dataDir}.`,
      error,
    );
  }
  return db as unknown as Db;
}
