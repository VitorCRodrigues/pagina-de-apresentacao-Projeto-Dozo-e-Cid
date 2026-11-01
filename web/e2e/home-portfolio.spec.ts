import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "es-AR", viewport: { width: 375, height: 812 } });

async function signIn(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

// In-app navigation: a reload would end the session (the token lives in memory only).
async function goTo(page: Page, tab: string) {
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: tab })
    .click();
}

async function expectNoHorizontalScroll(page: Page) {
  // A string: the e2e tsconfig has no DOM types.
  const overflow = await page.evaluate<number>(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("home, portfolio and history at 375 px", async ({ page }) => {
  await signIn(page, "returned");

  await expect(page.getByRole("heading", { level: 1, name: "Tu cuenta" })).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Actualizado el /)).toBeVisible();
  await expect(page.getByRole("region", { name: "Próximo aporte" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Aportes en curso" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Próxima ventana de inversión" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await goTo(page, "Cartera");
  await expect(page.getByRole("list", { name: "Posiciones" })).toBeVisible();
  await expect(page.getByText(/Última actualización:/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ver extractos oficiales en Interactive Brokers/ }),
  ).toBeVisible();
  await expect(page.getByText(/Invertir implica riesgos/)).toBeVisible();
  await expectNoHorizontalScroll(page);

  await goTo(page, "Aportar");
  const history = page.getByRole("region", { name: "Historial" });
  await history.getByText("Devueltos").click();
  const returned = history.getByRole("link", { name: /Depósito devuelto/ }).first();
  await expect(returned).toBeVisible();
  await expectNoHorizontalScroll(page);
  await returned.click();
  await expect(page).toHaveURL(/\/aportar\/(?!nuevo)[\w-]+$/);
  await expect(page.getByRole("list", { name: "Estado del aporte" })).toBeVisible();
});
