import { expect, test, type Locator, type Page } from "@playwright/test";

// Keyboard only, no mouse: Tab, Shift+Tab, Enter, Space, arrows and typing (PRD section 9).
// Every stop must show its focus ring, and no flow may trap the focus.
test.use({ locale: "es-AR" });

// Tabs forward until `target` has the focus, checking each stop shows a visible focus ring.
async function tabTo(page: Page, target: Locator, max = 60) {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const focused = await target.evaluate((el) => el === document.activeElement).catch(() => false);
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "body";
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== "none";
      // Controls inside a frame show the ring on the frame (focus-within).
      const frame = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const frameRing =
        frame !== null && frame.outlineStyle !== "none" && parseFloat(frame.outlineWidth) > 0;
      return outline || shadow || frameRing ? "ok" : `no ring on ${el.outerHTML.slice(0, 120)}`;
    });
    expect(["ok", "body"]).toContain(ring);
    if (focused) return;
  }
  throw new Error(`Tab never reached ${String(target)}`);
}

async function activate(page: Page, target: Locator, key: "Enter" | "Space" = "Enter") {
  await tabTo(page, target);
  await page.keyboard.press(key);
}

async function typeInto(page: Page, target: Locator, text: string) {
  await tabTo(page, target);
  await page.keyboard.type(text);
}

// A real keystroke lasts a few dozen milliseconds. Radix moves the radio focus on the next tick
// and selects only while the arrow is still down; press() releases it at once.
async function arrow(page: Page, key: "ArrowDown" | "ArrowUp") {
  await page.keyboard.down(key);
  await page.waitForTimeout(50);
  await page.keyboard.up(key);
}

async function signIn(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await activate(page, page.getByRole("button", { name: "Entrar" }));
  await page.waitForURL((url) => url.pathname !== "/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
}

const navLink = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name });

test("onboarding, from the saved address to the submitted application", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "draft");
  await expect(page).toHaveURL(/\/onboarding\/domicilio$/);
  await typeInto(page, page.getByLabel("Calle y número"), "Av. Santa Fe 1000");
  await typeInto(page, page.getByLabel("Localidad"), "Buenos Aires");
  await tabTo(page, page.getByRole("combobox", { name: "Provincia" }));
  await page.keyboard.type("Ciudad");
  await typeInto(page, page.getByLabel("Código postal"), "C1059ABC");
  await activate(page, page.getByRole("button", { name: "Continuar" }));

  await expect(page).toHaveURL(/\/onboarding\/perfil$/);
  await expect(page.getByRole("radiogroup").first()).toBeVisible();
  for (const group of await page.getByRole("radiogroup").all()) {
    await activate(page, group.getByRole("radio").first(), "Space");
  }
  await activate(page, page.getByRole("checkbox").first(), "Space");
  await activate(page, page.getByRole("button", { name: "Continuar" }));

  await expect(page).toHaveURL(/\/onboarding\/fondos$/);
  await tabTo(page, page.getByRole("combobox", { name: "Ocupación" }));
  await page.keyboard.type("Jub");
  await tabTo(page, page.getByRole("combobox", { name: /De dónde viene el dinero/ }));
  await page.keyboard.type("Ahorros");
  // Nothing is chosen yet: Tab lands on the group's first option, the arrow moves to "No".
  const exposed = page
    .getByRole("radiogroup")
    .filter({ has: page.getByRole("radio", { name: "No" }) });
  await tabTo(page, exposed.getByRole("radio").first());
  await arrow(page, "ArrowDown");
  await expect(page.getByRole("radio", { name: "No" })).toBeChecked();
  await activate(page, page.getByRole("button", { name: "Continuar" }));

  await expect(page).toHaveURL(/\/onboarding\/identidad$/);
  await activate(page, page.getByRole("button", { name: "Empezar la verificación" }));
  await expect(page.getByText("Tu identidad está verificada.")).toBeVisible({ timeout: 5000 });
  await activate(page, page.getByRole("button", { name: "Continuar" }));

  await expect(page).toHaveURL(/\/onboarding\/terminos$/);
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await activate(page, box, "Space");
  await activate(page, page.getByRole("button", { name: "Continuar" }));

  await expect(page).toHaveURL(/\/onboarding\/revision$/);
  await activate(page, page.getByRole("button", { name: "Enviar solicitud" }));
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("a deposit, from the amount to the instructions", async ({ page }) => {
  await signIn(page, "open");
  await activate(page, navLink(page, "Aportar"));
  await activate(page, page.getByRole("link", { name: "Nuevo aporte" }));
  await typeInto(page, page.getByLabel("Valor en dólares"), "500");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();
  // Arrows move within the rail group; back to the recommended one.
  await tabTo(page, page.getByRole("radio", { name: /USDC desde una exchange/ }));
  await arrow(page, "ArrowDown");
  await expect(page.getByRole("radio", { name: /Transferencia bancaria SWIFT/ })).toBeChecked();
  await arrow(page, "ArrowUp");
  await expect(page.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();
  await activate(page, page.getByRole("button", { name: "Continuar" }));
  await activate(page, page.getByRole("button", { name: "Confirmar aporte" }));
  await expect(page.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeVisible();
});

test("the plan: create, pause and cancel, and the dialog keeps the focus inside", async ({
  page,
}) => {
  await signIn(page, "empty");
  await activate(page, page.getByRole("link", { name: "Crear plan" }));
  await typeInto(page, page.getByLabel("Valor por mes"), "500");
  await activate(page, page.getByRole("button", { name: "Continuar" }));
  await activate(page, page.getByRole("button", { name: "Guardar plan" }));
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();

  await activate(page, page.getByRole("button", { name: "Pausar plan" }));
  await expect(page.getByText("Pausado", { exact: true })).toBeVisible();

  await activate(page, page.getByRole("button", { name: "Cancelar plan" }));
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Twenty Tabs and the focus is still inside the dialog: no way out but its own buttons.
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  // Escape closes it and gives the focus back to the button that opened it.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancelar plan" })).toBeFocused();

  await page.keyboard.press("Enter");
  await activate(page, page.getByRole("dialog").getByRole("button", { name: "Cancelar plan" }));
  await expect(page.getByText(/Tu plan anterior fue cancelado/)).toBeVisible();
});
