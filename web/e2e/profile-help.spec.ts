import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "es-AR", viewport: { width: 375, height: 812 } });

async function signIn(page: Page, scenario = "open") {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

// In-app navigation: a reload would end the session (the token lives in memory only).
async function goTo(page: Page, tab: string) {
  await page.getByRole("navigation").first().getByRole("link", { name: tab }).click();
}

async function expectNoHorizontalScroll(page: Page) {
  // A string: the e2e tsconfig has no DOM types.
  const overflow = await page.evaluate<number>(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("the profile changes the language, and the choice survives signing out", async ({ page }) => {
  await signIn(page);
  await goTo(page, "Perfil");
  await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("radio", { name: "Português" }).click();
  await expect(
    page.getByRole("navigation").first().getByRole("link", { name: "Carteira" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("radio", { name: "Português" })).toBeChecked();
});

test("help answers open, and support is there", async ({ page }) => {
  await signIn(page);
  await goTo(page, "Perfil");
  await page.getByRole("link", { name: "Ayuda" }).click();
  await page.getByRole("button", { name: "¿Quién guarda mi dinero?" }).click();
  await expect(page.getByText(/Interactive Brokers, en una cuenta a tu nombre/)).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expect(page.getByRole("link", { name: "Escribir a soporte" })).toBeVisible();
});

test("redoes the investor profile and returns to the profile", async ({ page }) => {
  await signIn(page);
  await goTo(page, "Perfil");
  await page.getByRole("link", { name: /Perfil de inversor/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Perfil de inversor" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar respuestas" }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByText("Guardamos tus respuestas")).toBeVisible();
});

test("the way to Interactive Brokers stays on one line", async ({ page }) => {
  await signIn(page);
  await goTo(page, "Perfil");
  const box = await page.getByRole("link", { name: /Ir a Interactive Brokers/ }).boundingBox();
  expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(48);
});

test("the profile and help reflow at 320 px, in every language", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await signIn(page);
  await goTo(page, "Perfil");
  await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("radio", { name: "Português" }).click();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
