import "dotenv/config";
import { getDb, getDbKind } from "../src/lib/db/client";
import { addDays, addMonths, currentMonthKey, monthRange, todayIso } from "../src/lib/dates";
import { rupeesToPaise } from "../src/lib/money";
import { listCategories } from "../src/lib/services/categories";
import { createTransaction, countTransactions } from "../src/lib/services/transactions";
import { ensureDemoAccount } from "../src/lib/services/user-identity";

/**
 * Development seed.
 *
 *   npm run db:seed            -> creates the demo account (demo@expenses.local / demo12345)
 *                                 with default categories and settings
 *   npm run db:seed -- --demo  -> additionally inserts clearly-marked demo transactions
 *
 * Demo data is refused in production unless --force is passed.
 */
const args = new Set(process.argv.slice(2));
const wantDemo = args.has("--demo");
const force = args.has("--force");
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

interface DemoRow {
  type: "INCOME" | "EXPENSE";
  rupees: number;
  description: string;
  category: string;
  dayOffset: number;
  tags?: string[];
}

const MONTHLY_TEMPLATE: DemoRow[] = [
  { type: "INCOME", rupees: 55000, description: "Salary", category: "Salary", dayOffset: 0, tags: ["work"] },
  { type: "EXPENSE", rupees: 15000, description: "House rent", category: "Rent", dayOffset: 2 },
  { type: "EXPENSE", rupees: 850, description: "Dinner at Swiggy", category: "Food", dayOffset: 3, tags: ["personal"] },
  { type: "EXPENSE", rupees: 350, description: "Uber to office", category: "Transport", dayOffset: 4, tags: ["work"] },
  { type: "EXPENSE", rupees: 2400, description: "Groceries at DMart", category: "Groceries", dayOffset: 5, tags: ["family"] },
  { type: "EXPENSE", rupees: 1200, description: "Electricity bill", category: "Utilities", dayOffset: 7 },
  { type: "EXPENSE", rupees: 649, description: "Netflix", category: "Subscriptions", dayOffset: 8 },
  { type: "EXPENSE", rupees: 3200, description: "New headphones", category: "Shopping", dayOffset: 11, tags: ["personal"] },
  { type: "EXPENSE", rupees: 1500, description: "Mobile + broadband", category: "Bills", dayOffset: 12 },
  { type: "EXPENSE", rupees: 420, description: "Lunch with team", category: "Food", dayOffset: 14, tags: ["work"] },
  { type: "EXPENSE", rupees: 799, description: "Movie night", category: "Entertainment", dayOffset: 16, tags: ["family"] },
  { type: "EXPENSE", rupees: 2000, description: "Doctor visit", category: "Health", dayOffset: 18 },
  { type: "EXPENSE", rupees: 4500, description: "Car EMI", category: "EMI", dayOffset: 20 },
  { type: "EXPENSE", rupees: 300, description: "Auto rickshaw", category: "Transport", dayOffset: 22 },
  { type: "EXPENSE", rupees: 980, description: "Weekend brunch", category: "Food", dayOffset: 25, tags: ["personal"] },
];

async function main(): Promise<void> {
  console.log(`Seeding ${getDbKind() === "memory" ? "in-memory MongoDB" : "MongoDB"} database...`);
  await getDb();
  const account = await ensureDemoAccount();
  const categories = await listCategories(account.id);
  console.log(`Demo account ready: ${account.email} / ${account.password} (${categories.length} categories).`);

  if (!wantDemo) {
    console.log("Done. Pass --demo to insert demo transactions.");
    return;
  }
  if (isProduction && !force) {
    console.error("Refusing to insert demo data into a production database. Pass --force to override.");
    process.exit(1);
  }
  const existing = await countTransactions(account.id);
  if (existing > 0 && !force) {
    console.error(`Demo account already has ${existing} transactions. Pass --force to add demo data anyway.`);
    process.exit(1);
  }

  const byName = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));
  const today = todayIso();
  const thisMonth = currentMonthKey();
  let created = 0;
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = addMonths(thisMonth, -offset);
    const { start } = monthRange(month);
    const variance = 1 + ((5 - offset) % 3) * 0.08;
    for (const row of MONTHLY_TEMPLATE) {
      const date = addDays(start, row.dayOffset);
      if (date > today) continue;
      const category = byName.get(`${row.type}:${row.category.toLowerCase()}`);
      if (!category) continue;
      const rupees = row.type === "INCOME" ? row.rupees : Math.round(row.rupees * variance);
      await createTransaction(account.id, {
        type: row.type,
        amount: rupeesToPaise(rupees),
        description: row.description,
        categoryId: category.id,
        date,
        notes: "Demo data (seed)",
        tags: [...(row.tags ?? []), "demo"],
      });
      created += 1;
    }
  }
  console.log(`Inserted ${created} demo transactions tagged "demo" into the demo account.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
