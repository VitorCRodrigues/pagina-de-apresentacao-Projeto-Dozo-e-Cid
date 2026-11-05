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

// PRD 11: "Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e
// rede errada". The flow from the amount to the instructions.
test("Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e rede errada", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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
  await expect(page.getByText(/Enviá solamente USDC en esta red/)).toBeVisible();
  await expect(page.getByText(/¿Tenés USDT\? Convertilo a USDC/)).toBeVisible();

  // The token and network come from the API: what the screen says is what GET /deposits/:id says.
  const id = new URL(page.url()).pathname.split("/").pop() ?? "";
  const instructions = await page.evaluate(async (depositId) => {
    const response = await fetch(`/api/v1/deposits/${depositId}`, {
      headers: { Authorization: "Bearer e2e", Accept: "application/json" },
    });
    const deposit = (await response.json()) as {
      instructions?: { token: string; network: string; address: string };
    };
    return deposit.instructions;
  }, id);
  expect(instructions?.network).toBeTruthy();
  await expect(
    page.getByText(`${instructions?.token ?? ""} · red ${instructions?.network ?? ""}`),
  ).toBeVisible();

  const address = page.getByText(instructions?.address ?? "", { exact: true });
  await expect(address).toBeVisible();
  // The copy button on the address's own line.
  const addressLine = address.locator("xpath=..");
  await addressLine.getByRole("button", { name: "Copiar" }).click();
  await expect(addressLine.getByRole("button", { name: "Copiado" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(instructions?.address);
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

// PRD 11. The server refuses an expired quote at confirmation; long-session.spec.ts covers the
// countdown running out.
test("Cotação expirada bloqueia a confirmação e oferece nova cotação", async ({ page }) => {
  await signIn(page, "quote_expired");
  await toPreview(page);
  await page.getByRole("button", { name: "Confirmar aporte" }).click();

  await expect(page.getByText("La cotización venció")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();
  await page.getByRole("button", { name: "Generar nueva cotización" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
});

test("a returned deposit shows in Aportar, and its detail explains the return", async ({
  page,
}) => {
  await signIn(page, "returned");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Aportar" })
    .click();
  const returned = page.getByRole("link", { name: /Depósito devuelto/ }).first();
  await expect(returned).toBeVisible();
  await returned.click();

  await expect(page.getByText("Devolvimos este depósito")).toBeVisible();
  await expect(page.getByText(/no está a tu nombre/)).toBeVisible();
  await expect(page.getByText(/El dinero vuelve a la cuenta de origen/)).toBeVisible();
  await expect(page.getByRole("link", { name: /soporte/i }).first()).toHaveAttribute(
    "href",
    /^mailto:/,
  );
  const timeline = page.getByRole("list", { name: /Estado del aporte|Seguimiento/ });
  await expect(timeline).toContainText("Depósito devuelto");
});

// The rail name is short; it never breaks over two lines at 375 px, wherever it shows.
for (const [language, name, newDeposit, amount, plan] of [
  ["Español", "USDC desde una exchange", "Nuevo aporte", "Valor en dólares", "Ver plan"],
  ["Português", "USDC de uma exchange", "Novo aporte", "Valor em dólares", "Ver plano"],
  ["English", "USDC from an exchange", "New deposit", "Amount in dollars", "View plan"],
] as const) {
  test(`"${name}" stays on one line at 375 px (${language})`, async ({ page }) => {
    await page.goto("/?scenario=open");
    await page.getByRole("radio", { name: language }).click();
    await page.getByRole("button", { name: /^(Entrar|Sign in)$/ }).click();
    await expect(page).toHaveURL(/\/inicio$/);

    const lines = async (where: string) => {
      for (const el of await page.getByText(name, { exact: true }).all()) {
        const { height, lineHeight } = await el.evaluate((node) => ({
          height: node.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(node).lineHeight),
        }));
        expect(height, `${where}: "${name}" wraps`).toBeLessThan(lineHeight * 1.5);
      }
    };

    await page.getByRole("link", { name: plan }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    await lines("plan summary");

    await page.getByRole("navigation").first().getByRole("link").nth(1).click();
    await page.getByRole("link", { name: newDeposit }).click();
    await page.getByLabel(amount).fill("500");
    await page.keyboard.press("Enter");
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    await lines("rail step");
    await page.getByRole("button", { name: /^(Continuar|Continue)$/ }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await lines("preview");
  });
}
