import { expect, test, type Page } from "@playwright/test";

// The built app under its Content-Security-Policy: no screen may break it. Runs against the
// measure build (same bundle and CSP as dist/, plus the in-page mock and an open session):
// npm run test:csp builds it, serves it and runs this file. The regular e2e run skips it.
const base = process.env.MEASURE_URL;

test.skip(!base, "MEASURE_URL not set: run npm run test:csp");
test.use({ locale: "es-AR" });

async function collectViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test("the CSP meta is in place", async ({ page }) => {
  await page.goto(`${base ?? ""}/inicio`);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    "content",
    /default-src 'self'.*script-src 'self'/,
  );
});

for (const path of [
  "/inicio",
  "/cartera",
  "/aportar",
  "/aportar/nuevo",
  "/aportar/dep-scenario",
  "/plan",
  "/pendientes",
  "/perfil",
  "/perfil/ayuda",
  "/cuenta?scenario=action_required",
]) {
  test(`no CSP violation on ${path}`, async ({ page }) => {
    const violations = await collectViolations(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base ?? ""}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    expect(await violations()).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// Dialogs lock the page's scroll with a <style> Radix injects at runtime (react-remove-scroll).
test("no CSP violation when a dialog opens, and the page behind does not scroll", async ({
  page,
}) => {
  const violations = await collectViolations(page);
  await page.goto(`${base ?? ""}/perfil`);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);
  expect(await violations()).toEqual([]);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
});
