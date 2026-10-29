import { expect, test } from "@playwright/test";

test.use({ locale: "es-AR" });

test("detects Spanish and switches language on the entry screen", async ({ page }) => {
  await page.goto("/?scenario=open");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tu cuenta de inversión en dólares, con aportes mensuales.",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.getByRole("radio", { name: "Português" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sua conta de investimento em dólar, com aportes mensais.",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
});

test("falls back to Spanish for an unsupported browser language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto("/?scenario=open");

  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await context.close();
});

test("signs in and reaches home with the bottom navigation", async ({ page }) => {
  await page.goto("/?scenario=open");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
});

test("keeps a client pending at IBKR away from deposits", async ({ page }) => {
  await page.goto("/?scenario=ibkr_pending");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole("heading", { name: "Interactive Brokers está analizando tu cuenta" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
});
