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

// The investor profile is long: its action bar stays on the bottom of the screen, above the
// navigation, and the last question scrolls clear of it, at 375 and at 320 px.
for (const width of [375, 320]) {
  test(`the investor profile keeps its action bar at the bottom, clear of the last question, at ${String(width)} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await signIn(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Perfil" })
      .click();
    await page.getByRole("link", { name: /Perfil de inversor/ }).click();
    const save = page.getByRole("button", { name: "Guardar respuestas" });
    await expect(save).toBeInViewport();

    // Bottom of the screen: the bar's bottom edge sits on the top of the bottom navigation
    // (or the viewport edge when there is none).
    const bar = await save.evaluate((el) => {
      let node: Element | null = el;
      while (node && getComputedStyle(node).position !== "fixed") node = node.parentElement;
      return node?.getBoundingClientRect().toJSON() as DOMRect | undefined;
    });
    expect(bar).toBeDefined();
    const navTop = await page
      .getByRole("navigation", { name: "Navegación principal" })
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs((bar?.bottom ?? 0) - Math.min(navTop, 700))).toBeLessThanOrEqual(1);

    // Scrolled to the end, the last question sits above the bar, not under it.
    await page.mouse.wheel(0, 5000);
    await expect(save).toBeInViewport();
    const lastGroup = await page.getByRole("radiogroup").last().boundingBox();
    expect((lastGroup?.y ?? 0) + (lastGroup?.height ?? 0)).toBeLessThanOrEqual(bar?.top ?? 0);
  });
}
