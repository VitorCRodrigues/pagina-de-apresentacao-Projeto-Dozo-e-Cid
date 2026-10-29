import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "es-AR" });

async function choose(page: Page, field: string, option: string) {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option }).click();
}

// The draft scenario stops at the address. The browser mock keeps its db in memory, so a
// reload starts over; resuming after a reload is covered by src/features/onboarding/resume.test.tsx.
test("resumes a draft at the address and submits the application", async ({ page }) => {
  await page.goto("/?scenario=draft");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/domicilio$/);
  await expect(page.getByText("Paso 3 de 8")).toBeVisible();
  await page.getByLabel("Calle y número").fill("Av. Santa Fe 1000");
  await page.getByLabel("Localidad").fill("Buenos Aires");
  await choose(page, "Provincia", "Ciudad Autónoma de Buenos Aires");
  await page.getByLabel("Código postal").fill("C1059ABC");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/perfil$/);
  // The questions come from the API: wait for them before answering.
  await expect(page.getByRole("radiogroup").first()).toBeVisible();
  for (const group of await page.getByRole("radiogroup").all()) {
    await group.getByRole("radio").first().click();
  }
  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/fondos$/);
  await choose(page, "Ocupación", "Jubilado");
  await choose(page, "¿De dónde viene el dinero que vas a invertir?", "Ahorros");
  await page.getByRole("radio", { name: "No" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/identidad$/);
  await page.getByRole("button", { name: "Empezar la verificación" }).click();
  await expect(page.getByText("Tu identidad está verificada.")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/terminos$/);
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/revision$/);
  await expect(page.getByText("Av. Santa Fe 1000")).toBeVisible();
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud" })).toBeVisible();
  await expect(page.getByText(/Suele tardar algunos días hábiles/)).toBeVisible();
});

test("keeps the Continuar button in view while the form scrolls", async ({ page }) => {
  await page.goto("/?scenario=draft");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(page).toHaveURL(/\/onboarding\/datos$/);

  const button = page.getByRole("button", { name: "Continuar" });
  await expect(button).toBeInViewport();
  await page.mouse.wheel(0, 2000);
  await expect(button).toBeInViewport();
});
