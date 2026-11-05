import { expect, test, type Page } from "@playwright/test";

// PRD section 9: no token in persistent storage, no personal data in URLs or query strings.
test.use({ locale: "es-AR" });

// What the mock's client is: name, e-mail, CUIL, address (src/mocks/fixtures.ts).
// An e-mail address, not any "@": the dev server's own paths start with /@vite.
const personal = [
  /lucia/i,
  /fernandez/i,
  /[^\s/@]+@[^\s/@]+\.[a-z]{2,}/i,
  /\b20-?\d{8}-?\d\b/,
  /santa.?fe/i,
];
const tokenLike = /^(mock-|Bearer |ey[A-Za-z0-9_-]{10,})|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/;

async function walkTheApp(page: Page) {
  const nav = (name: string) =>
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name })
      .click();
  await page.goto("/?scenario=open");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await nav("Aportar");
  await page.getByRole("link", { name: "Nuevo aporte" }).click();
  await page.getByLabel("Valor en dólares").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(page.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeVisible();
  for (const name of ["Cartera", "Pendientes", "Perfil", "Inicio"]) {
    await nav(name);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.getByRole("link", { name: "Ver plan" }).click();
  await expect(page.getByRole("heading", { name: "Plan mensual" })).toBeVisible();
}

test("no token and no personal data in localStorage or sessionStorage", async ({ page }) => {
  await walkTheApp(page);
  const stored = await page.evaluate(() =>
    [localStorage, sessionStorage].flatMap((storage) =>
      Object.keys(storage).map((key) => ({ key, value: storage.getItem(key) ?? "" })),
    ),
  );
  // Only the language chosen on this device, and the mock's scenario (development only).
  for (const { key, value } of stored) {
    expect(key, key).toMatch(/^od\.(locale\.choice|mock\.scenario)$/);
    expect(value, key).not.toMatch(tokenLike);
    for (const pattern of personal) expect(value, key).not.toMatch(pattern);
  }
  const cookies = await page.context().cookies();
  expect(cookies).toEqual([]);
});

test("no personal data or token in any URL the app visits", async ({ page }) => {
  const urls: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) urls.push(frame.url());
  });
  page.on("request", (request) => urls.push(request.url()));
  await walkTheApp(page);
  // In-app navigation changes history without a request; read what the address bar held.
  urls.push(page.url());

  expect(urls.length).toBeGreaterThan(5);
  for (const url of urls) {
    const { pathname, search, hash } = new URL(url);
    const visible = decodeURIComponent(`${pathname}${search}${hash}`);
    for (const pattern of personal) expect(visible, url).not.toMatch(pattern);
    expect(visible, url).not.toMatch(/token|access_token|Bearer/i);
  }
});
