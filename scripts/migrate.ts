import "dotenv/config";
import { getDatabaseUri, getDb, getDbKind } from "../src/lib/db/client";

/**
 * MongoDB has no schema migrations; this script connects and creates the indexes the app relies
 * on (the app also does this automatically on first access). Useful as an explicit deploy step.
 */
async function main(): Promise<void> {
  const kind = getDbKind();
  const target = kind === "memory" ? "in-memory MongoDB" : getDatabaseUri().replace(/\/\/([^@]+)@/, "//***@");
  console.log(`Ensuring indexes on ${target}...`);
  const db = await getDb();
  const collections = await db.database.listCollections().toArray();
  console.log(`Connected. Collections: ${collections.map((c) => c.name).join(", ") || "(none yet)"}`);
  console.log("Indexes are in place.");
  await db.client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Index setup failed:", error);
    process.exit(1);
  });
