import { expect, test, type Page } from "@playwright/test";
import { E2E_USER } from "./fixtures";

/**
 * End-to-end flow against a production build with a fresh in-memory database.
 * The `setup` project has registered E2E_USER; these tests reuse its session and run
 * serially because they build on each other (add → edit → duplicate → delete).
 */
test.describe.configure({ mode: "serial" });

function todayInKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function monthLabel(offset = 0): string {
  const [y, m] = todayInKolkata().split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1 + offset, 1));
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

async function openAddDialog(page: Page) {
  await page.getByTestId("add-transaction").click();
  await expect(page.getByTestId("transaction-form")).toBeVisible();
}

async function pickCategory(page: Page, name: string) {
  await page.locator("#tx-category").click();
  await page.getByRole("option", { name }).click();
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing page points to registration and protected pages redirect to login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-title")).toContainText(/know where/i);
    await expect(page.getByTestId("cta-primary")).toHaveAttribute("href", "/register");
    await expect(page.getByTestId("nav-signin")).toHaveAttribute("href", "/login");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const api = await page.request.get("/api/transactions");
    expect(api.status()).toBe(401);
  });

  test("unknown pages show a friendly 404 instead of an error", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();
  });

  test("wrong password is rejected, duplicate registration is refused", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(E2E_USER.email);
    await page.locator("#login-password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("Incorrect e-mail or password");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/register");
    await page.locator("#reg-name").fill("Someone");
    await page.locator("#reg-email").fill(E2E_USER.email);
    await page.locator("#reg-password").fill("another-password-1");
    await page.locator("#reg-confirm").fill("another-password-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("already exists");
  });

  test("sign in with the right password lands on the dashboard", async ({ page }) => {
    await page.goto("/login?next=/analytics");
    await page.locator("#login-email").fill(E2E_USER.email);
    await page.locator("#login-password").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByTestId("account-menu")).toContainText(E2E_USER.name);
  });
});

test("dashboard loads with empty state", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText(/Good (morning|afternoon|evening|night)/);
  await expect(page.getByTestId("total-balance")).toContainText("₹0");
  await expect(page.getByText("No transactions yet")).toBeVisible();
  await expect(page.getByText(monthLabel(), { exact: true })).toBeVisible();
});

test("add income", async ({ page }) => {
  await page.goto("/dashboard");
  await openAddDialog(page);
  await page.getByRole("radio", { name: "Income" }).click();
  await expect(page.locator("#tx-amount")).toBeFocused();
  await page.locator("#tx-amount").fill("55000");
  await page.locator("#tx-description").fill("Salary");
  await pickCategory(page, "Salary");
  await page.getByRole("button", { name: "Add income" }).click();
  await expect(page.getByText("Income added")).toBeVisible();
  await expect(page.getByTestId("transaction-form")).toBeHidden();
  await expect(page.getByTestId("income-amount")).toContainText("₹55,000");
  await expect(page.getByTestId("total-balance")).toContainText("₹55,000");
});

test("add expense and see savings", async ({ page }) => {
  await page.goto("/dashboard");
  await openAddDialog(page);
  await page.getByRole("radio", { name: "Expense" }).click();
  await page.locator("#tx-amount").fill("850");
  await page.locator("#tx-description").fill("Dinner");
  await pickCategory(page, "Food");
  await page.locator("#tx-tags").fill("personal");
  await page.locator("#tx-tags").press("Enter");
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByText("Expense added")).toBeVisible();
  await expect(page.getByTestId("expense-amount")).toContainText("₹850");
  await expect(page.getByTestId("savings-rate")).toContainText("98.5%");
  await expect(page.getByTestId("top-category-amount")).toContainText("₹850");
});

test("validation blocks an empty form", async ({ page }) => {
  await page.goto("/dashboard");
  await openAddDialog(page);
  await page.getByRole("button", { name: /Add (expense|income)/ }).click();
  await expect(page.getByText("Amount is required")).toBeVisible();
  await expect(page.getByText("Description is required")).toBeVisible();
  await expect(page.getByText("Choose a category")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("transactions page: search and filter", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByTestId("transaction-row")).toHaveCount(2);
  await page.getByTestId("transaction-filters").getByLabel("Search transactions").fill("dinner");
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
  await expect(page.getByTestId("transaction-row").first()).toContainText("Dinner");
  await page.getByTestId("transaction-filters").getByLabel("Search transactions").fill("");
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByTestId("transaction-row")).toHaveCount(2);
  await page.getByTestId("transaction-filters").getByRole("radio", { name: "Income" }).click();
  await expect(page).toHaveURL(/type=INCOME/);
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
  await expect(page.getByTestId("transaction-row").first()).toContainText("Salary");
  await page.goto("/transactions?tags=personal");
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
  await expect(page.getByTestId("transaction-row").first()).toContainText("Dinner");
});

test("top bar search jumps to filtered transactions", async ({ page }) => {
  await page.goto("/dashboard");
  const search = page.getByRole("search").getByLabel("Search transactions");
  await search.fill("salary");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/transactions\?q=salary/);
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
});

test("edit expense", async ({ page }) => {
  await page.goto("/transactions?q=dinner");
  await page.getByTestId("transaction-row").first().click();
  await expect(page.getByTestId("transaction-form")).toBeVisible();
  await expect(page.locator("#tx-amount")).toHaveValue("850");
  await page.locator("#tx-amount").fill("900");
  await page.locator("#tx-description").fill("Dinner at Swiggy");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Expense updated")).toBeVisible();
  await expect(page.getByTestId("transaction-row").first()).toContainText("Dinner at Swiggy");
  await expect(page.getByTestId("transaction-row").first()).toContainText("₹900");
});

test("duplicate and delete with confirmation", async ({ page }) => {
  await page.goto("/transactions?q=swiggy");
  await page.getByRole("button", { name: "Actions for Dinner at Swiggy" }).first().click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(page.getByText("Transaction duplicated")).toBeVisible();
  await expect(page.getByTestId("transaction-row")).toHaveCount(2);

  await page.getByRole("button", { name: "Actions for Dinner at Swiggy" }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete this transaction?");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("transaction-row")).toHaveCount(2);

  await page.getByRole("button", { name: "Actions for Dinner at Swiggy" }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Transaction deleted")).toBeVisible();
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
});

test("change month from the top bar", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /Previous month/ }).click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await expect(page.getByText(monthLabel(-1), { exact: true })).toBeVisible();
  await expect(page.getByText("No transactions yet")).toBeVisible();
  await page.getByRole("button", { name: /Next month/ }).click();
  await expect(page).not.toHaveURL(/month=/);
  await expect(page.getByTestId("income-amount")).toContainText("₹55,000");
});

test("calendar shows the day's transactions", async ({ page }) => {
  await page.goto(`/calendar?day=${todayInKolkata()}`);
  await expect(page.getByRole("heading", { level: 2 })).toContainText(monthLabel());
  await expect(page.getByRole("button", { name: /Edit Dinner at Swiggy/ })).toBeVisible();
  await page.getByRole("radio", { name: "week" }).click();
  await expect(page.getByRole("grid", { name: "Week" })).toBeVisible();
});

test("analytics renders totals and breakdowns", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page.getByText("Total income")).toBeVisible();
  await expect(page.getByLabel("Range totals")).toContainText("₹55,000");
  await expect(page.getByText("Income sources")).toBeVisible();
  await expect(page.getByText("Largest expenses")).toBeVisible();
  await page.goto("/analytics?range=12m");
  await expect(page.getByText(/last 12 months/).first()).toBeVisible();
});

test("export JSON backup", async ({ request }) => {
  const response = await request.get("/api/export?format=json");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { format: string; transactions: unknown[] };
  expect(body.format).toBe("expenses-tracker-backup");
  expect(body.transactions.length).toBe(2);
  const csv = await request.get("/api/export?format=csv");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Dinner at Swiggy");
});

test("settings: categories, data and account", async ({ page }) => {
  await page.goto("/settings?tab=categories");
  await expect(page.getByText("Expense categories")).toBeVisible();
  await expect(page.getByText("Food", { exact: true })).toBeVisible();
  await page.goto("/settings?tab=data");
  await expect(page.getByText("Export JSON backup")).toBeVisible();

  await page.goto("/settings?tab=account");
  await expect(page.getByText(E2E_USER.email)).toBeVisible();
  await page.locator("#acct-current").fill("wrong-password");
  await page.locator("#acct-new").fill("new-password-456");
  await page.locator("#acct-confirm").fill("new-password-456");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Current password is incorrect")).toBeVisible();
});

test("budgets: set a limit in settings and track it on the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("budgets-cta")).toBeVisible();

  await page.goto("/settings?tab=budgets");
  await page.getByTestId("budget-input-Food").fill("1000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Food budget saved")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByTestId("budget-card")).toContainText("of ₹1,000");
  await expect(page.getByTestId("budget-spent")).toContainText("₹900");
  await expect(page.getByRole("progressbar", { name: "Food budget used" })).toHaveAttribute("aria-valuenow", "90");

  const api = await page.request.get("/api/budgets");
  const body = (await api.json()) as { progress: { totalBudget: number; items: { status: string }[] } };
  expect(body.progress.totalBudget).toBe(100_000);
  expect(body.progress.items[0]?.status).toBe("warning");
});

test("health endpoint reports status and database round trip", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { status: string; database: { pingMs: number } };
  expect(body.status).toBe("ok");
  expect(typeof body.database.pingMs).toBe("number");
});

test("sign out returns to the landing page", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByTestId("account-menu").click();
  await page.getByTestId("sign-out").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("nav-signin")).toHaveAttribute("href", "/login");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
