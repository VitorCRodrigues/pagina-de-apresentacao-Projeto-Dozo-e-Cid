import { expect, test } from "@playwright/test";

test.use({ locale: "es-AR" });

test("detects Spanish and switches language", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba de idiomas");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.getByRole("radio", { name: "Português" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teste de idiomas");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
});

test("falls back to Spanish for an unsupported browser language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba de idiomas");
  await context.close();
});
