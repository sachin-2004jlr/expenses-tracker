import { expect, test as setup } from "@playwright/test";
import { E2E_USER, STORAGE_STATE } from "./fixtures";

/** Registers the e2e account (fresh in-memory DB per run) and saves the session cookie. */
setup("register and sign in", async ({ page }) => {
  await page.goto("/register");
  await page.locator("#reg-name").fill(E2E_USER.name);
  await page.locator("#reg-email").fill(E2E_USER.email);
  await page.locator("#reg-password").fill(E2E_USER.password);
  await page.locator("#reg-confirm").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("account-menu")).toContainText(E2E_USER.name);
  await page.context().storageState({ path: STORAGE_STATE });
});
