import "dotenv/config";
import { getDb, getDbKind } from "../src/lib/db/client";

/**
 * Apply pending Drizzle migrations to DATABASE_URL (or the local PGlite database).
 * The app also auto-migrates on first access; this script exists for explicit deploy steps.
 */
async function main(): Promise<void> {
  const kind = getDbKind();
  console.log(`Applying migrations to ${kind === "postgres" ? "PostgreSQL (DATABASE_URL)" : "local PGlite database"}...`);
  await getDb();
  console.log("Migrations are up to date.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
