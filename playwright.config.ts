import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const STORAGE_STATE = "e2e/.auth/user.json";

/**
 * End-to-end tests run against a production build with a fresh in-memory PGlite database and
 * the mock AI provider, so neither PostgreSQL nor Ollama is required (CI-safe).
 * The `setup` project registers an account and saves its session; the main project reuses it.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
  webServer: {
    // A production build on its own port: does not conflict with a running `next dev`
    // (Next.js allows only one dev server per project) and exercises the real build output.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      AUTH_SECRET: "e2e-only-secret-not-for-production",
      AUTH_ALLOWED_EMAILS: "",
      AI_PROVIDER: "mock",
      PGLITE_DATA_DIR: "memory://",
      DATABASE_URL: "",
      APP_TIMEZONE: "Asia/Kolkata",
    },
  },
});
