import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
const pgliteDir = process.env.PGLITE_DATA_DIR || "./.data/pglite";

/**
 * Drizzle Kit configuration.
 * - `npm run db:generate` only needs `schema` + `out`.
 * - `npm run db:studio` / `drizzle-kit migrate` connect to DATABASE_URL when set,
 *   otherwise to the local embedded PGlite database.
 */
export default databaseUrl
  ? defineConfig({
      dialect: "postgresql",
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: databaseUrl },
      strict: true,
      verbose: true,
    })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: pgliteDir },
      strict: true,
      verbose: true,
    });
