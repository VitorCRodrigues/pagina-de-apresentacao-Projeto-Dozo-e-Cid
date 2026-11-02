import { expect, test, type Browser, type Page } from "@playwright/test";

const phone = { width: 375, height: 812 };
test.use({ locale: "es-AR", viewport: phone });

async function signIn(page: Page, scenario: string, button: RegExp = /^Entrar$/) {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: button }).click();
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

// PRD section 10: the risk notice must be readable on plan screens, never behind the fixed bar.
async function expectRiskNoteClearOfActionBar(page: Page) {
  await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  const note = await page.getByText(/Invertir implica riesgos/).boundingBox();
  const bar = await page.locator("div.fixed.bottom-0").first().boundingBox();
  expect(note).not.toBeNull();
  expect(bar).not.toBeNull();
  expect((note?.y ?? 0) + (note?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
}

for (const viewport of [phone, { width: 1280, height: 900 }]) {
  test(`the risk note stays readable above the action bar at ${String(viewport.width)} px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await signIn(page, "empty");
    await page.getByRole("link", { name: "Crear plan" }).click();
    await page.getByLabel("Valor por mes").fill("500");
    await expectRiskNoteClearOfActionBar(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expectRiskNoteClearOfActionBar(page);
  });
}

test("creates, pauses, resumes and cancels the monthly plan", async ({ page }) => {
  await signIn(page, "empty");
  await page.getByRole("link", { name: "Crear plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Plan mensual" })).toBeVisible();
  await page.getByLabel("Valor por mes").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByText("Activo")).toBeVisible();

  await page.getByRole("button", { name: "Pausar plan" }).click();
  await page.getByRole("button", { name: "Retomar plan" }).click();
  await page.getByRole("button", { name: "Cancelar plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar plan" }).click();
  await expect(page.getByText(/Tu plan anterior fue cancelado/)).toBeVisible();
});

test("accepts new terms only after opening the document", async ({ page }) => {
  await signIn(page, "terms_update");
  await goTo(page, "Pendientes");
  await page.getByRole("button", { name: "Revisar y aceptar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox")).toBeDisabled();
  const popup = page.waitForEvent("popup");
  await dialog.getByRole("link", { name: /Leer el documento/ }).click();
  await (await popup).close();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Aceptar" }).click();
  await expect(page.getByRole("button", { name: "Revisar y aceptar" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

test("the plan reminder opens a new deposit with the amount filled in and no amount in the URL", async ({
  page,
}) => {
  await signIn(page, "plan_reminder");
  await goTo(page, "Pendientes");
  await page.getByRole("link", { name: "Hacer el aporte" }).click();
  await expect(page).toHaveURL(/\/aportar\/nuevo$/);
  await expect(page.getByLabel("Valor en dólares")).toHaveValue("500,00");
});

const statements = [
  {
    locale: "es-AR",
    signIn: /^Entrar$/,
    tab: "Cartera",
    link: "Ver extractos en Interactive Brokers",
  },
  {
    locale: "pt-BR",
    signIn: /^Entrar$/,
    tab: "Carteira",
    link: "Ver extratos na Interactive Brokers",
  },
  {
    locale: "en-US",
    signIn: /^Sign in$/,
    tab: "Portfolio",
    link: "View statements at Interactive Brokers",
  },
];

async function statementsHeight(browser: Browser, entry: (typeof statements)[number]) {
  const context = await browser.newContext({ locale: entry.locale, viewport: phone });
  const page = await context.newPage();
  await signIn(page, "open", entry.signIn);
  await goTo(page, entry.tab);
  const box = await page.getByRole("link", { name: new RegExp(entry.link) }).boundingBox();
  await context.close();
  return box?.height ?? Number.POSITIVE_INFINITY;
}

for (const entry of statements) {
  test(`the statements button stays on one line at 375 px (${entry.locale})`, async ({
    browser,
  }) => {
    // One line of a 48 px button; two lines would grow it past that.
    expect(await statementsHeight(browser, entry)).toBeLessThanOrEqual(48);
  });
}
