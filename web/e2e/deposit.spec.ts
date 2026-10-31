import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "es-AR" });

async function signIn(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

async function toPreview(page: Page) {
  // In-app navigation: a reload would end the session (the token lives in memory only).
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Aportar" })
    .click();
  await page.getByRole("link", { name: "Nuevo aporte" }).click();
  await page.getByLabel("Valor en dólares").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
}

test("a USDC deposit from the amount to the instructions", async ({ page }) => {
  await signIn(page, "open");
  await toPreview(page);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(page).toHaveURL(/\/aportar\/(?!nuevo)[\w-]+$/);
  await expect(page.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeVisible();
  await expect(page.getByText(/^USDC · red /)).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Código QR de la dirección de depósito" }),
  ).toBeVisible();
  await expect(page.getByText("500.00")).toBeVisible();
});

test("the browser's Back walks the deposit steps without leaving the flow", async ({ page }) => {
  await signIn(page, "open");
  await toPreview(page);

  await page.goBack();
  await expect(page.getByRole("heading", { name: "¿Cómo vas a enviar el dinero?" })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Valor en dólares")).toHaveValue("500,00");
  await expect(page).toHaveURL(/\/aportar\/nuevo$/);
});

test("a quote the server calls expired asks for a new one", async ({ page }) => {
  await signIn(page, "quote_expired");
  await toPreview(page);
  await page.getByRole("button", { name: "Confirmar aporte" }).click();

  await expect(page.getByText("La cotización venció")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();
  await page.getByRole("button", { name: "Generar nueva cotización" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
});
