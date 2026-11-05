import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG 2.1 AA on every route, in the states a client meets (PRD section 9).
test.use({ locale: "es-AR" });

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, where: string) {
  // Colours are read mid-animation otherwise (a dialog rising in is still translucent).
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  const found = violations.map(
    (v) => `${where}: ${v.id} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
  expect(found).toEqual([]);
}

async function signIn(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname !== "/");
  // The landing screen, after the redirect sign-in makes.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
}

async function goInApp(page: Page, path: string) {
  const before = await page
    .locator("h1")
    .first()
    .textContent({ timeout: 1000 })
    .catch(() => null);
  await page.evaluate((to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page
    .waitForFunction((old) => document.querySelector("h1")?.textContent !== old, before, {
      timeout: 4000,
    })
    .catch(() => undefined);
  await expect(page.getByText("Cargando información")).toHaveCount(0, { timeout: 10_000 });
}

test("the entry screen", async ({ page }) => {
  await page.goto("/?scenario=open");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await scan(page, "/");
});

const routes: Record<string, string[]> = {
  open: [
    "/inicio",
    "/aportar",
    "/aportar/nuevo",
    "/aportar/dep-scenario",
    "/cartera",
    "/plan",
    "/pendientes",
    "/perfil",
    "/perfil/ayuda",
    "/perfil/inversor",
    "/no-existe",
  ],
  empty: ["/inicio", "/aportar", "/plan", "/pendientes"],
  deposit_notified: ["/aportar/dep-scenario"],
  returned: ["/aportar/dep-scenario"],
  action_required: ["/cuenta"],
  restricted: ["/inicio", "/aportar/nuevo", "/plan", "/perfil"],
  terms_update: ["/pendientes"],
};

for (const [scenario, paths] of Object.entries(routes)) {
  test(`routes in the ${scenario} scenario`, async ({ page }) => {
    await signIn(page, scenario);
    for (const path of paths) {
      await goInApp(page, path);
      await scan(page, `${scenario} ${path}`);
    }
  });
}

test("every onboarding step", async ({ page }) => {
  await signIn(page, "draft");
  for (const step of ["residencia", "datos", "domicilio", "perfil", "fondos", "terminos"]) {
    await goInApp(page, `/onboarding/${step}`);
    await scan(page, `onboarding ${step}`);
  }
});

test("the deposit steps, and a dialog open", async ({ page }) => {
  await signIn(page, "open");
  await goInApp(page, "/aportar/nuevo");
  await page.getByLabel("Valor en dólares").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  await scan(page, "rail step");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await scan(page, "preview");

  await goInApp(page, "/plan");
  await page.getByRole("button", { name: "Cancelar plan" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await scan(page, "cancel plan dialog");
});

test("a select focused, with its options", async ({ page }) => {
  await signIn(page, "draft");
  // The draft resumes at the address. A native select's open list belongs to the browser;
  // what the page owns is the focused control and its options.
  await page.getByRole("combobox", { name: "Provincia" }).focus();
  await scan(page, "province select focused");
});

// What a screen reader hears on the deposit detail: an ordered list, each step with its state in
// words and, once reached, its date; the current one marked as the current step.
test("the deposit timeline reads in order, with each state and date", async ({ page }) => {
  await signIn(page, "partner_collected");
  await goInApp(page, "/aportar/dep-scenario");
  const timeline = page.getByRole("list", { name: "Estado del aporte" });
  await expect(timeline).toMatchAriaSnapshot(`
    - list "Estado del aporte":
      - listitem:
        - paragraph: Esperando tu depósito , Completado
        - time
      - listitem:
        - paragraph: USDC recibido , Paso actual
        - time
      - listitem:
        - paragraph: Dinero en tu cuenta , Pendiente
      - listitem:
        - paragraph: Invertido , Pendiente
  `);
  await expect(timeline.locator('li[aria-current="step"]')).toHaveText(/USDC recibido/);
});
