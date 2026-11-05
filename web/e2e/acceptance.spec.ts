import { expect, test, type Page } from "@playwright/test";

// PRD section 11, "Critérios de aceite principais": one test per criterion, named with its text,
// at 375 px (the project's viewport). Two criteria live where their flows already were:
// deposit.spec.ts ("Cotação expirada…" and "Tela USDC…"). docs/acceptance-report.md maps them all.
test.use({ locale: "es-AR" });

const statusesNotOpen = [
  "draft",
  "submitted",
  "kyc_review",
  "ibkr_pending",
  "action_required",
  "restricted",
  "rejected",
] as const;

const scenarios = [
  ...["draft", "submitted", "kyc_review", "ibkr_pending", "action_required", "open"],
  ...["restricted", "rejected"],
  ...["kyc_passed", "ibkr_open", "deposit_notified", "partner_collected", "fx_executed"],
  ...["wire_sent", "broker_credited", "invested", "returned"],
  ...["ibkr_not_open", "ibkr_restricted", "compliance_hold", "quote_expired", "pix_med_hold"],
  ...["market_not_live", "slow", "server_error", "empty", "in_flight_only", "plan_paused"],
  ...["plan_reminder", "terms_update", "maintenance"],
];

async function signIn(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await page.getByRole("button", { name: /^(Entrar|Entrar|Sign in)$/ }).click();
  await page.waitForURL((url) => url.pathname !== "/");
  // The landing screen, after the redirect sign-in makes.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
}

// In-app navigation to any path: a reload would end the session (the token lives in memory).
// Routes load lazily and the old screen stays until the new one is ready, so wait for the h1
// to change (or, for a path that keeps it, give the route time to settle).
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
}

const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name })
    .click();

async function toPreview(page: Page, rail = /USDC desde una exchange/) {
  await nav(page, "Aportar");
  await page.getByRole("link", { name: "Nuevo aporte" }).click();
  await page.getByLabel("Valor en dólares").fill("500");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: rail }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
}

async function confirmDeposit(page: Page, rail?: RegExp) {
  await toPreview(page, rail);
  await page.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(page.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeVisible();
}

const instructionsShown = (page: Page) =>
  page.getByText(/Cómo enviar el dinero|Dirección de depósito|^Referencia$|SWIFT\/BIC/);

test.describe("Critérios de aceite (PRD 11)", () => {
  test("Nenhuma instrução de depósito aparece enquanto accountStatus não for open", async ({
    page,
  }) => {
    // Seven statuses, each signed in again: longer than one flow.
    test.setTimeout(120_000);
    for (const status of statusesNotOpen) {
      await signIn(page, status);
      for (const path of ["/aportar", "/aportar/nuevo", "/aportar/dep-scenario"]) {
        await goInApp(page, path);
        await expect(page.locator("main")).toBeVisible();
        await expect(instructionsShown(page), `${status} ${path}`).toHaveCount(0);
        await expect(page.getByLabel("Valor en dólares"), `${status} ${path}`).toHaveCount(0);
      }
    }
  });

  test("Não é possível confirmar um aporte sem ver a prévia de custos", async ({ page }) => {
    await signIn(page, "open");
    await nav(page, "Aportar");
    await page.getByRole("link", { name: "Nuevo aporte" }).click();
    await expect(page.getByRole("button", { name: "Confirmar aporte" })).toHaveCount(0);
    await page.getByLabel("Valor en dólares").fill("500");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("radio").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar aporte" })).toHaveCount(0);
    await page.getByRole("button", { name: "Continuar" }).click();

    const confirm = page.getByRole("button", { name: "Confirmar aporte" });
    await expect(confirm).toBeVisible();
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table).toContainText("Costo total");
    // The table comes before the button, in reading order and on screen.
    const [tableBox, buttonBox] = [await table.boundingBox(), await confirm.boundingBox()];
    expect((tableBox?.y ?? 0) < (buttonBox?.y ?? 0)).toBe(true);
  });

  test("Plano mensal abaixo de minRecurringUsdCents é rejeitado com explicação", async ({
    page,
  }) => {
    await signIn(page, "empty");
    await page.getByRole("link", { name: "Crear plan" }).click();
    await page.getByLabel("Valor por mes").fill("200");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/El mínimo mensual es US\$\s?250,00/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar plan" })).toHaveCount(0);
  });

  test("Tela SWIFT mostra a referência obrigatória e o aviso de conta no nome do cliente", async ({
    page,
  }) => {
    await signIn(page, "open");
    await confirmDeposit(page, /Transferencia bancaria SWIFT/);
    await expect(page.getByText("Referencia", { exact: true })).toBeVisible();
    await expect(page.getByText(/Obligatoria\. Escribila tal cual/)).toBeVisible();
    await expect(page.getByText(/tiene que salir de una cuenta a tu nombre/)).toBeVisible();
  });

  test("A linha do tempo esconde fx_executed e wire_sent para ar_usdc", async ({ page }) => {
    await signIn(page, "open");
    await confirmDeposit(page);
    const usdc = page.getByRole("list", { name: "Estado del aporte" });
    await expect(usdc).toBeVisible();
    await expect(usdc).not.toContainText("Cambio realizado");
    await expect(usdc).not.toContainText("Transferencia enviada");
    await expect(usdc).toContainText("USDC recibido");

    await confirmDeposit(page, /Transferencia bancaria SWIFT/);
    const swift = page.getByRole("list", { name: "Estado del aporte" });
    await expect(swift).toContainText("Cambio realizado");
    await expect(swift).toContainText("Transferencia enviada");
  });

  test('Clique duplo em "Confirmar" não cria dois aportes (mesma Idempotency-Key)', async ({
    page,
  }) => {
    await signIn(page, "empty");
    // Record what the app sends, above the mock that answers it.
    await page.evaluate(() => {
      const calls: { method: string; url: string; key: string | null }[] = [];
      (window as unknown as { __calls: typeof calls }).__calls = calls;
      const original = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const request = new Request(input, init);
        calls.push({
          method: request.method,
          url: request.url,
          key: request.headers.get("Idempotency-Key"),
        });
        return original(input, init);
      };
    });
    await toPreview(page);
    await page.getByRole("button", { name: "Confirmar aporte" }).dblclick();
    await expect(page.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeVisible();

    const posts = await page.evaluate(() =>
      (
        window as unknown as { __calls: { method: string; url: string; key: string | null }[] }
      ).__calls.filter((c) => c.method === "POST" && c.url.endsWith("/api/v1/deposits")),
    );
    expect(posts.length).toBeGreaterThanOrEqual(1);
    expect(new Set(posts.map((p) => p.key)).size).toBe(1);
    expect(posts[0]?.key).toBeTruthy();

    await nav(page, "Aportar");
    await expect(page.getByRole("region", { name: "En curso" }).getByRole("link")).toHaveCount(1);
  });

  test("Todos os textos existem em ES, PT e EN; nenhum texto fixo no código", async ({ page }) => {
    const rawKey = /\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(\.[a-zA-Z_]+)*\b/g;
    const allowed = /opendollars|interactivebrokers|example\.com|ibkr/i;
    for (const language of ["Español", "Português", "English"]) {
      await page.goto("/?scenario=open");
      await page.getByRole("radio", { name: language }).click();
      await page.getByRole("button", { name: /^(Entrar|Sign in)$/ }).click();
      await expect(page).toHaveURL(/\/inicio$/);
      for (const path of ["/inicio", "/aportar", "/cartera", "/plan", "/pendientes", "/perfil"]) {
        await goInApp(page, path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        // E-mail addresses look like keys ("lucia.fernandez@…"); they are data, not text.
        const text = (await page.locator("body").innerText()).replace(/\S+@\S+/g, "");
        const keys = (text.match(rawKey) ?? []).filter((match) => !allowed.test(match));
        expect(keys, `${language} ${path}`).toEqual([]);
        // Dates and versions always in the client's language, never raw (2026-10).
        expect(text, `${language} ${path}`).not.toMatch(/\b\d{4}-\d{2}\b/);
      }
    }
  });

  test("Brasil e trilhos br_* não aparecem quando BR não está em liveMarkets", async ({ page }) => {
    // The draft resumes at the address; Volver walks back to step 1.
    await signIn(page, "draft");
    const residence = page.getByRole("heading", { name: "¿Dónde vivís?" });
    await expect(async () => {
      if (!(await residence.isVisible())) {
        await page.getByRole("button", { name: "Volver" }).click({ timeout: 2000 });
      }
      await expect(residence).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    const country = page.getByRole("combobox", { name: "País de residencia" });
    await expect(country.getByRole("option", { name: "Argentina" })).toHaveCount(1);
    await expect(country.getByRole("option", { name: "Brasil" })).toHaveCount(0);

    await signIn(page, "empty");
    await nav(page, "Aportar");
    await page.getByRole("link", { name: "Nuevo aporte" }).click();
    await page.getByLabel("Valor en dólares").fill("500");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("radio").first()).toBeVisible();
    await expect(page.getByText(/Pix|Banco de cambio|Brasil/)).toHaveCount(0);

    await goInApp(page, "/plan");
    await expect(page.getByText(/Pix|Banco de cambio|Brasil/)).toHaveCount(0);
  });

  test("O app não tem nenhuma tela de saque nem campo para credenciais da IBKR", async ({
    page,
  }) => {
    await signIn(page, "open");
    const routes = ["/inicio", "/aportar", "/aportar/nuevo", "/cartera", "/plan"];
    for (const path of [...routes, "/pendientes", "/perfil", "/perfil/ayuda"]) {
      await goInApp(page, path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("input[type=password]"), path).toHaveCount(0);
      await expect(page.getByLabel(/usuario|contraseña|password/i), path).toHaveCount(0);
      // The only way to money out is the IBKR portal, in a new tab.
      for (const link of await page.getByRole("link", { name: /retir|saque|withdraw/i }).all()) {
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("href", /^https:\/\//);
      }
      await expect(page.getByRole("button", { name: /retir|saque|withdraw/i }), path).toHaveCount(
        0,
      );
    }
    for (const path of ["/retiro", "/retirar", "/saque", "/withdraw"]) {
      await goInApp(page, path);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(
        /No encontramos esta página/,
      );
    }

    // The account status screen, where documents are sent: files only, no credentials.
    await signIn(page, "action_required");
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.locator("input[type=password]")).toHaveCount(0);
    await expect(page.getByLabel(/usuario|contraseña|password/i)).toHaveCount(0);
  });

  test("Cada tela tem estados de carregando, vazio e erro testados", async ({ page }) => {
    const routes = ["/aportar", "/cartera", "/plan", "/pendientes", "/perfil"];

    // Loading: every route shows its loading state before the data (3 s mock latency).
    await page.goto("/?scenario=slow");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("status").first()).toBeVisible();
    await expect(page).toHaveURL(/\/inicio$/, { timeout: 15_000 });
    for (const path of routes) {
      await goInApp(page, path);
      await expect(page.getByRole("status").first(), path).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible({ timeout: 15_000 });
    }

    // Empty: a new client.
    await signIn(page, "empty");
    await expect(page.getByText("No tenés aportes en curso.")).toBeVisible();
    await goInApp(page, "/aportar");
    await expect(page.getByText("No tenés aportes en curso.")).toBeVisible();
    await goInApp(page, "/pendientes");
    await expect(page.getByText("Estás al día")).toBeVisible();
    await goInApp(page, "/plan");
    await expect(page.getByLabel("Valor por mes")).toBeVisible();

    // Error: the API fails; the client is told and can retry.
    await page.goto("/?scenario=server_error");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("No pudimos cargar esta información")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test.describe("Todos os cenários de mock (DepositState, AccountStatus, BlockReason) renderizam sem erro", () => {
    for (const scenario of scenarios) {
      test(scenario, async ({ page }) => {
        const problems: string[] = [];
        page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") problems.push(`console: ${message.text()}`);
        });
        await signIn(page, scenario);
        for (const path of ["/inicio", "/aportar", "/aportar/dep-scenario", "/cuenta"]) {
          await goInApp(page, path);
          await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible({
            timeout: 10_000,
          });
        }
        expect(problems).toEqual([]);
      });
    }
  });
});
