import { expect, test, type Page } from "@playwright/test";

// The manual test that found these bugs: one tab, scenarios switched with the selector, screens
// visited in between, and a session long enough for Chrome to restart the mock's service worker
// (about five minutes). Stopping the workers by CDP stands in for the wait.
test.use({ locale: "es-AR" });

const GENERIC = "Algo salió mal de nuestro lado";

async function signIn(page: Page) {
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

async function switchScenario(page: Page, id: string) {
  await page.locator("details summary").first().click();
  await Promise.all([page.waitForEvent("load"), page.locator("details select").selectOption(id)]);
}

const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name })
    .click();

// What the tester did before the failing action: three scenarios in the same tab.
async function sameTabAsTheManualTest(page: Page) {
  await page.goto("/?scenario=empty");
  await signIn(page);
  await switchScenario(page, "returned");
  await signIn(page);
  await nav(page, "Aportar");
  await switchScenario(page, "open");
  await signIn(page);
}

async function restartServiceWorkers(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  await cdp.send("ServiceWorker.stopAllWorkers");
}

test("pausing and cancelling the plan work after the browser restarts the service worker", async ({
  page,
}) => {
  await sameTabAsTheManualTest(page);
  await page.getByRole("link", { name: "Ver plan" }).click();
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  await restartServiceWorkers(page);

  await page.getByRole("button", { name: "Pausar plan" }).click();
  await expect(page.getByText("Pausado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar plan" }).click();
  await expect(page.getByText(/Tu plan anterior fue cancelado/)).toBeVisible();
  await expect(page.getByText(GENERIC)).toHaveCount(0);
});

test("a quote that runs out on the clock gives way to a new one", async ({ page }) => {
  await page.clock.install();
  await sameTabAsTheManualTest(page);
  await nav(page, "Aportar");
  await page.getByRole("link", { name: "Nuevo aporte" }).click();
  await page.getByLabel("Valor en dólares").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();

  await restartServiceWorkers(page);
  await page.clock.fastForward("05:01");
  await expect(page.getByText("La cotización venció")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();

  await page.getByRole("button", { name: "Generar nueva cotización" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
  await expect(page.getByText("La cotización venció")).toHaveCount(0);
  await expect(page.getByText(GENERIC)).toHaveCount(0);
});
