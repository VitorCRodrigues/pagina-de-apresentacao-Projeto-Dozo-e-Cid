# Camada de API, src/lib e mocks — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a camada de dados do app (tipos + Zod, cliente HTTP, erros tipados, Idempotency-Key, hooks TanStack Query), os utilitários de `src/lib` e os mocks MSW com cenários selecionáveis por `?scenario=`, sem nenhuma tela de produto.

**Architecture:** Funções de endpoint puras (`src/api/endpoints.ts`) chamam um cliente `fetch` fino (`src/api/client.ts`) que injeta bearer, `Accept-Language` e `Idempotency-Key`, converte erros em `ApiError` e valida respostas com Zod só em dev/teste. Os hooks em `src/api/hooks/` envolvem essas funções. Os mocks mantêm um "banco" em memória montado a partir do cenário ativo; os handlers leem esse banco, de modo que o mesmo conjunto de handlers serve dev, Storybook e Vitest.

**Tech Stack:** React 19, TypeScript 6 strict, TanStack Query 5, Zod 4.6, MSW 3, i18next, Vitest + Testing Library.

**Spec:** `web/docs/prd-frontend.md` (seções 5, 6, 8), `web/docs/decisions.md` (itens 12, 14–16), `web/docs/api-gaps.md` (endpoints e campos propostos), `web/CLAUDE.md`.

## Global Constraints

- Nomes de tipos, estados, trilhos e campos exatamente como na seção 8; `src/api/types.ts` não muda.
- Tudo o que não está na seção 8 vem de `api-gaps.md` e vive em `src/api/proposed-types.ts`; o que for inventado aqui entra também no `api-gaps.md`.
- Dinheiro em centavos inteiros; nenhuma soma ou arredondamento com float.
- Base `/api/v1`; toda requisição envia `Accept-Language: es|pt|en`; toda criação (`POST /deposits`, `POST /plans`) envia `Idempotency-Key`.
- Token só em memória (`AuthProvider`), nunca em `localStorage`.
- Erro é traduzido por `code`, nunca por `message`; cada `ApiErrorCode` e `BlockReason` tem chave em `es/pt/en.json` (ES com voseo).
- Config mock: `liveMarkets: ["AR"]`, `minRecurringUsdCents: 25000`.
- Nada de mock, cenário ou seletor de cenário no build de produção.
- TDD em toda tarefa: teste falhando, código mínimo, teste passando, commit (Conventional Commits em inglês).

## Review Focus

1. **Clique duplo em Confirmar:** a mesma intenção reenvia a mesma `Idempotency-Key` e o mock devolve o mesmo aporte, sem criar dois. (Tarefa 6 e Tarefa 9.)
2. **Troca de idioma no meio da sessão:** o conteúdo editorial (descrições de ETF, pendências, `returnReason`) é buscado de novo no idioma novo. (Tarefa 7.)
3. **Erro sem corpo JSON** (por exemplo, HTML de um proxy com 502): vira `ApiError` com `code: "internal"` e o status, sem quebrar. (Tarefa 4.)
4. **Valor digitado no formato de outro locale** (`"1.234,5"` em EN, três casas decimais, negativo, acima do inteiro seguro): `parseAmountToCents` devolve `null`, não um número errado. (Tarefa 1.)
5. **Requisição sem token:** o mock responde `401 session_expired` e o cliente expõe esse `code`. (Tarefa 4 e Tarefa 9.)

## Estado em 28/10, antes da execução

A fase 4 (T1, sessão e roteamento) já implementou parte deste plano. Cada tarefa abaixo traz uma linha **Estado** dizendo o que existe e o que falta; a execução estende o código existente, sem reescrever o que funciona. Os passos de commit não se aplicam: pela regra do `web/CLAUDE.md`, nada é commitado.

Diferenças entre o código existente e o plano, mantidas como estão:

- **Cliente HTTP (Tarefa 4):** a resposta é escolhida por nome, `request(method, path, { response: "me" })`, com o tipo vindo de `ResponseTypes` (`src/api/response-types.ts`) e o schema de `responseSchemas` (`src/api/schemas.ts`), importado sob demanda só quando valida. Isso tirou o Zod do bundle de produção. Onde o plano diz `schema: <xSchema>`, leia `response: "<nome>"` e registre o nome nos dois mapas.
- **Corpo de erro (Tarefa 4):** lido por um guard manual em `errors.ts`, sem Zod, pelo mesmo motivo. `ApiErrorBody.error.code` é `string` (códigos desconhecidos viram `internal`).
- **Auth (Tarefa 7):** `useAuth()` devolve `{ status, login, logout, getAccessToken }`; o token não é exposto como valor.
- **Cenários (Tarefas 8 e 9):** a função de teste é `setScenario(id | null)`; `MockDb.failure` (`{ status, code, until? }`) substitui `failAll`. A fase 4 criou o cenário `maintenance` (503 com `until`), usado em teste e story: o total fica em **27 cenários** (os 26 deste plano + `maintenance`).

---

## Estrutura de arquivos

```
src/lib/
  money.ts        + applyBasisPoints, parseAmountToCents (existentes: formatMoney, sumCents...)
  dates.ts        + formatDate, opção timeZone em todas as funções
  cuit.ts         isValidCuit, normalizeCuit, formatCuit
  age.ts          isAtLeastAge
src/api/
  types.ts                 (sem mudanças)
  proposed-types.ts        tipos do api-gaps.md
  schemas.ts               Zod de types.ts + proposed-types.ts
  errors.ts                ApiError, ApiErrorCode, toApiError
  client.ts                createApiClient
  auth-context.ts / AuthProvider.tsx
  api-context.ts / ApiProvider.tsx
  idempotency.ts           createIdempotencyKey, useIdempotencyKey
  endpoints.ts             uma função por rota da seção 8
  query-keys.ts
  hooks/{config,account,onboarding,portfolio,plans,deposits}.ts
src/mocks/
  fixtures/{config,people,portfolio,deposits,onboarding}.ts
  scenarios.ts             ScenarioId, scenarioGroups, buildMockDb
  scenario-state.ts        currentScenario (URL + sessionStorage), setScenarioForTests
  db.ts                    MockDb e mutações
  handlers.ts              createHandlers()
  ScenarioSwitcher.tsx     seletor flutuante, só dev
```

---

### Tarefa 1: Dinheiro — arredondamento por basis points e leitura do valor digitado

**Estado:** nada existe ainda. Executar como escrito.

**Files:**
- Modify: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `applyBasisPoints(cents: number, basisPoints: number): number` (arredonda meio para cima, só inteiros); `parseAmountToCents(input: string, locale: Locale): number | null`.

- [ ] **Step 1: Testes que falham**

```ts
it("applies basis points with integer rounding", () => {
  expect(applyBasisPoints(50000, 30)).toBe(150);   // 0,30% de US$ 500
  expect(applyBasisPoints(16667, 30)).toBe(50);    // 50,001 -> 50
  expect(applyBasisPoints(16684, 30)).toBe(50);    // 50,052 -> 50
  expect(applyBasisPoints(16834, 30)).toBe(51);    // 50,502 -> 51
  expect(() => applyBasisPoints(10.5, 30)).toThrow(TypeError);
});
it("parses typed amounts per locale into cents", () => {
  expect(parseAmountToCents("250", "es")).toBe(25000);
  expect(parseAmountToCents("1.234,5", "es")).toBe(123450);
  expect(parseAmountToCents("1,234.50", "en")).toBe(123450);
  expect(parseAmountToCents("US$ 0,01", "pt")).toBe(1);
  expect(parseAmountToCents(" 250,00 ", "es")).toBe(25000);
});
it.each([
  ["1.234,5", "en"], ["0,001", "es"], ["-10", "es"], ["", "es"], ["abc", "en"],
  ["1,2,3", "en"], ["99999999999999999", "es"],
])("rejects %s in %s", (input, locale) => {
  expect(parseAmountToCents(input, locale as Locale)).toBeNull();
});
```

E casos-limite de formatação que ainda faltam: `formatMoney(1, "es")` → `"US$ 0,01"`, `formatMoney(-1, "en")` → `"-$0.01"`, `formatMoney(99, "pt")` → `"US$ 0,99"`, `formatMoney(100, "en")` → `"$1.00"`.

- [ ] **Step 2:** `npx vitest run src/lib/money.test.ts` → FAIL (`applyBasisPoints is not defined`).
- [ ] **Step 3:** Implementar. `applyBasisPoints`: `Math.floor((cents * bp + 5000) / 10000)` depois de `assertCents` nas duas entradas. `parseAmountToCents`: remover símbolo e espaços; separador decimal do locale (`,` em es/pt, `.` em en); agrupamento só em grupos de três; no máximo duas casas; montar a string e converter com `Number.parseInt` dos dígitos (sem `parseFloat`); `null` se passar de `Number.MAX_SAFE_INTEGER`.
- [ ] **Step 4:** Rodar de novo → PASS.
- [ ] **Step 5:** Commit `feat(web): parse typed amounts and apply basis points in integer cents`.

### Tarefa 2: Datas por fuso, CUIT/CUIL e idade mínima

**Estado:** `formatDateTime` e `formatTime` existem (com relógio de 24 h em es/pt); falta a opção `timeZone`, `formatDate`, `cuit.ts` e `age.ts`.

**Files:**
- Modify: `src/lib/dates.ts`; Create: `src/lib/cuit.ts`, `src/lib/age.ts`
- Test: `src/lib/dates.test.ts`, `src/lib/cuit.test.ts`, `src/lib/age.test.ts`
- Modify: `src/components/Field.stories.tsx` (o CUIT "válido" da story, `20123456789`, é inválido; trocar por `20123456786`)

**Interfaces:**
- Produces: `formatDateTime(iso, locale, opts?: { timeZone?: string })`, `formatDate(iso, locale, opts?)`, `formatTime(iso, locale, opts?)`; `normalizeCuit(v: string): string` (só dígitos), `isValidCuit(v: string): boolean`, `formatCuit(v: string): string` (`"20-12345678-6"`); `isAtLeastAge(birthDate: string, minAge?: number, today?: Date): boolean` (`birthDate` no formato `YYYY-MM-DD`, `minAge` padrão 18).

- [ ] **Step 1: Testes que falham**

```ts
// dates: o fuso muda o dia exibido
expect(formatDate("2026-10-28T02:30:00Z", "es", { timeZone: "America/Argentina/Buenos_Aires" })).toBe("27 oct 2026");
expect(formatDateTime("2026-10-27T21:05:00Z", "es", { timeZone: "America/Argentina/Buenos_Aires" })).toBe("27 oct 2026, 18:05");
expect(formatTime("2026-10-27T21:05:00Z", "en", { timeZone: "America/New_York" })).toBe("5:05 PM");

// cuit
expect(isValidCuit("20-12345678-6")).toBe(true);
expect(isValidCuit("20123456786")).toBe(true);
expect(isValidCuit("20 12345678 6")).toBe(true);
expect(isValidCuit("20123456780")).toBe(false);   // dígito errado
expect(isValidCuit("30123456781")).toBe(false);   // prefixo de empresa: o piloto é só pessoa física
expect(isValidCuit("2012345678")).toBe(false);    // 10 dígitos
expect(formatCuit("20123456786")).toBe("20-12345678-6");

// age (hoje fixo em 2026-10-27)
expect(isAtLeastAge("2008-10-27", 18, today)).toBe(true);   // faz 18 hoje
expect(isAtLeastAge("2008-10-28", 18, today)).toBe(false);  // faz 18 amanhã
expect(isAtLeastAge("2008-02-29", 18, new Date(2026, 1, 28))).toBe(false); // 29/2 conta como 1/3
expect(isAtLeastAge("2008-02-29", 18, new Date(2026, 2, 1))).toBe(true);
expect(isAtLeastAge("2030-01-01", 18, today)).toBe(false);
expect(isAtLeastAge("2008-13-01", 18, today)).toBe(false);
```

Os valores exatos de data do Intl entram no teste depois de rodar uma vez no Node 24 (o `Intl` do Node é a referência); os três acima são o contrato.

- [ ] **Step 2:** `npx vitest run src/lib` → FAIL.
- [ ] **Step 3:** Implementar. CUIT: 11 dígitos; prefixos de pessoa `20, 23, 24, 25, 26, 27`; pesos `5,4,3,2,7,6,5,4,3,2`; `dv = 11 - soma % 11`; `11 → 0`; `10 → inválido`. Idade: comparar ano/mês/dia de `today` no fuso local com o aniversário; 29/2 vira 1/3 em ano não bissexto; data inexistente → `false`. Datas: repassar `timeZone` ao `Intl.DateTimeFormat`; `hourCycle` continua `h23` em es/pt.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `feat(web): add CUIT/CUIL check digit, minimum age and time-zone aware dates`.

### Tarefa 3: Tipos propostos e schemas Zod

**Estado:** existem `zod`, `apiErrorCodes`, `ApiErrorBody`, `WaitlistRequest`, os schemas de `Country`, `Locale`, `Rail`, `AccountStatus`, `AppConfig`, `Me` e `ApiErrorBody`, e o teste de igualdade de tipos. Falta o resto dos tipos e schemas; cada resposta nova entra em `ResponseTypes` e `responseSchemas`.

**Files:**
- Create: `src/api/proposed-types.ts`, `src/api/schemas.ts`
- Test: `src/api/schemas.test.ts`
- Modify: `package.json` (dependência `zod@^4.6.7`)

**Interfaces:**
- Produces (proposed-types, do api-gaps.md):
  `ApiErrorCode = "validation_failed" | "quote_expired" | "below_minimum" | "account_not_open" | "account_restricted" | "compliance_hold" | "market_not_live" | "idempotency_conflict" | "not_found" | "session_expired" | "maintenance" | "rate_limited" | "internal"`;
  `OnboardingStep = "residence" | "personal" | "address" | "suitability" | "funds" | "identity" | "terms" | "review"`;
  `OnboardingDraft { currentStep: OnboardingStep; steps: Partial<Record<OnboardingStep, Record<string, unknown>>> }`;
  `Questionnaire { version: string; questions: { id: string; kind: "single" | "multi" | "number"; label: string; options?: { value: string; label: string }[] }[] }`;
  `Notification = PendingItem & { createdAt: string; readAt?: string }`;
  `NotificationPrefs { email: boolean; push: boolean }`;
  `DepositDetail = Deposit & { isFirstDeposit: boolean; quote?: { id: string; rateDescription?: string; createdAt: string }; blockReason?: BlockReason; instructions?: (DepositInstructionsUsdc | DepositInstructionsWire) & { scope: "account" | "deposit" } }`;
  `DepositsPage { items: DepositDetail[]; nextCursor?: string }`;
  `QuoteRequest { amountCents: number; planId?: string }`; `CreateDepositRequest { quoteId: string; rail: Rail }`;
  `CreatePlanRequest { amountCents: number; dayOfMonth: number; rail: Rail }`; `UpdatePlanRequest = Partial<CreatePlanRequest> & { status?: Plan["status"] }`;
  `ApiErrorBody { error: { code: ApiErrorCode; message: string; fields?: Record<string, string>; until?: string } }`.
- Produces (schemas): um schema por tipo, nomeado `<camelCaseDoTipo>Schema` (`appConfigSchema`, `meSchema`, `accountSchema`, `portfolioSchema`, `planSchema`, `quoteSchema`, `depositDetailSchema`, `depositsPageSchema`, `notificationSchema`, `onboardingDraftSchema`, `questionnaireSchema`, `notificationPrefsSchema`, `apiErrorBodySchema`...). Centavos com `z.number().int()`. Datas com `z.iso.datetime()`. ISIN com `z.string().regex(/^IE[A-Z0-9]{9}\d$/)` (a seção 8 diz "UCITS, nunca começa com US").

- [ ] **Step 1: Testes que falham** — igualdade de tipos e rejeições:

```ts
expectTypeOf<z.infer<typeof depositSchema>>().toEqualTypeOf<Deposit>();
expectTypeOf<z.infer<typeof appConfigSchema>>().toEqualTypeOf<AppConfig>();
// ...um expectTypeOf por tipo de types.ts e proposed-types.ts
expect(depositSchema.safeParse({ ...validDeposit, amountCents: 10.5 }).success).toBe(false);
expect(positionSchema.safeParse({ ...validPosition, isin: "US78462F1030" }).success).toBe(false);
expect(depositSchema.safeParse({ ...validDeposit, state: "pending" }).success).toBe(false);
```

- [ ] **Step 2:** `npm run typecheck && npx vitest run src/api/schemas.test.ts` → FAIL.
- [ ] **Step 3:** `npm install zod@^4.6.7`; escrever os tipos e os schemas.
- [ ] **Step 4:** Rodar → PASS (o `typecheck` também valida os `expectTypeOf`).
- [ ] **Step 5:** Commit `feat(web): add Zod schemas for the API contract and proposed types`.

### Tarefa 4: ApiError e cliente HTTP

**Estado:** existe e está testado (`client.ts`, `errors.ts`, `client.test.ts`), na forma descrita no topo. Falta só o que as rotas novas pedem: opção `query` (filtro e cursor de `GET /deposits`) e `formData` (`POST /account/documents`).

**Files:**
- Create: `src/api/errors.ts`, `src/api/client.ts`
- Test: `src/api/errors.test.ts`, `src/api/client.test.ts`

**Interfaces:**
- Produces: `class ApiError extends Error { status: number; code: ApiErrorCode | "network" | "invalid_response"; fields?: Record<string, string>; until?: string }`; `isApiError(e: unknown): e is ApiError`; `toApiError(response: Response): Promise<ApiError>`.
- Produces: `createApiClient(opts: { getToken: () => string | null; getLocale: () => Locale; fetch?: typeof fetch; validate?: boolean }): ApiClient`, com `ApiClient.request<T>(method: "GET" | "POST" | "PUT" | "PATCH", path: string, opts: { schema?: z.ZodType<T>; body?: unknown; formData?: FormData; idempotencyKey?: string; query?: Record<string, string | undefined>; signal?: AbortSignal }): Promise<T>`. `validate` padrão: `import.meta.env.DEV || import.meta.env.MODE === "test"`.

- [ ] **Step 1: Testes que falham** (MSW `server.use` captura a requisição):

```ts
it("sends bearer, Accept-Language and Idempotency-Key", async () => {
  // GET /api/v1/me capturado: Authorization "Bearer t-1", Accept-Language "pt"
  // POST /api/v1/deposits com idempotencyKey "k-1": header Idempotency-Key "k-1"
});
it("omits Authorization when there is no token", ...);
it("returns undefined for 204", ...);
it("turns { error: { code } } into ApiError with that code, status and fields", ...);   // 409 quote_expired
it("turns a non-JSON error body into ApiError internal with the status", ...);      // 502 text/html
it("turns an unknown error code into internal", ...);                                // code "teapot"
it("turns a rejected fetch into ApiError network", ...);
it("rejects a response that does not match the schema when validating", ...);       // code invalid_response
it("passes the response through unchecked when validation is off", ...);
```

- [ ] **Step 2:** `npx vitest run src/api/client.test.ts src/api/errors.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. Base `/api/v1`. `invalid_response` só registra no console os caminhos dos campos (`issue.path`), nunca os valores, por causa da regra de dados pessoais em logs.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `feat(web): add typed HTTP client with ApiError and Accept-Language`.

### Tarefa 5: Chaves i18n de erros e bloqueios

**Estado:** `errorMessageKey` e as chaves `errors.*` existem nos três idiomas. Falta `blockReason.*` e o teste que percorre todos os códigos e motivos.

**Files:**
- Modify: `src/i18n/{es,pt,en}.json`
- Create: `src/api/error-messages.ts`
- Test: `src/api/error-messages.test.ts`

**Interfaces:**
- Produces: `errorMessageKey(error: unknown): ParseKeys` → `errors.<code>` (`network` e `invalid_response` incluídos; qualquer outra coisa → `errors.internal`); chaves `blockReason.<reason>.message` e `blockReason.<reason>.action`.
- Textos de bloqueio vêm do sentido da tabela da seção 5 do PRD (ES em voseo). Exemplo: `ibkr_not_open` → "Tu cuenta está en análisis en Interactive Brokers." / ação "Ver pendientes"; `compliance_hold` → "No es posible hacer aportes en este momento." / "Hablar con soporte", sem revelar o motivo. `TODO(compliance)` no arquivo de mapeamento.

- [ ] **Step 1: Testes que falham**

```ts
it.each(apiErrorCodes)("%s has a message in es, pt and en", (code) => { /* i18n.exists(`errors.${code}`, { lng }) para os 3 */ });
it.each(blockReasons)("%s has message and action in es, pt and en", ...);
it("maps unknown values to errors.internal", () => {
  expect(errorMessageKey(new Error("x"))).toBe("errors.internal");
});
```

(`apiErrorCodes` e `blockReasons` exportados como arrays `as const` de `proposed-types.ts` e `schemas.ts`, para os testes iterarem.)

- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Escrever as chaves e o mapeamento.
- [ ] **Step 4:** Rodar → PASS (o teste de paridade de idiomas existente também).
- [ ] **Step 5:** Commit `feat(web): translate API error codes and block reasons`.

### Tarefa 6: Idempotency-Key por intenção

**Estado:** nada existe ainda. Executar como escrito.

**Files:**
- Create: `src/api/idempotency.ts`
- Test: `src/api/idempotency.test.ts`

**Interfaces:**
- Produces: `createIdempotencyKey(): string` (`crypto.randomUUID()`); `useIdempotencyKey(intent: unknown): { key: string; reset: () => void }`. A chave só muda quando `JSON.stringify(intent)` muda ou quando `reset()` é chamado (depois do sucesso).

- [ ] **Step 1: Testes que falham** (`renderHook`):

```ts
it("keeps the same key across re-renders and repeated clicks", ...);          // rerender 3x com a mesma intenção → mesma key
it("issues a new key when the intent changes", ...);                         // { quoteId: "q1" } → { quoteId: "q2" }
it("issues a new key after reset", ...);
it("returns a UUID v4", ...);                                                // regex
```

- [ ] **Step 2–4:** FAIL → implementar com `useState` + comparação da intenção serializada → PASS.
- [ ] **Step 5:** Commit `feat(web): add per-intent idempotency keys`.

### Tarefa 7: AuthProvider, ApiProvider, endpoints e hooks

**Estado:** existem `AuthProvider`, `ApiProvider` (já invalida as queries na troca de idioma e limpa `["session", ...]` no logout), `App.tsx` com os providers, `query-keys.ts`, `getConfig`, `getMe`, `joinWaitlist`, `useConfig`, `useMe`, `useJoinWaitlist`. Faltam os demais endpoints e hooks, `depositPollingInterval` e os testes de hooks.

**Files:**
- Create: `src/api/auth-context.ts`, `src/api/AuthProvider.tsx`, `src/api/api-context.ts`, `src/api/ApiProvider.tsx`, `src/api/endpoints.ts`, `src/api/query-keys.ts`, `src/api/hooks/{config,account,onboarding,portfolio,plans,deposits}.ts`
- Modify: `src/App.tsx` (envolver o router em `AuthProvider` e `ApiProvider`)
- Test: `src/api/hooks/hooks.test.tsx`, `src/api/endpoints.test.ts`

**Interfaces:**
- Consumes: `createApiClient` (Tarefa 4), schemas (Tarefa 3).
- Produces: `useAuth(): { token: string | null; login(): Promise<void>; logout(): void }`, com o token em memória; o `login()` placeholder de OIDC define `"dev-token"` (`TODO(decisão)`, provedor a escolher). `useApi(): ApiClient`. O `ApiProvider` invalida todas as queries quando o idioma muda.
- Endpoints (um por rota da seção 8): `getConfig`, `getMe`, `getOnboarding`, `saveOnboardingStep(step, data)`, `getQuestionnaire`, `submitOnboarding`, `getAccount`, `uploadDocument(itemId, file)`, `getPortfolio`, `getPlans`, `createPlan(body, key)`, `updatePlan(id, body)`, `createQuote(body)`, `createDeposit(body, key)`, `getDeposits({ state?, cursor? })`, `getDeposit(id)`, `getNotifications`.
- Hooks: `useConfig`, `useMe`, `useOnboarding`, `useSaveOnboardingStep`, `useQuestionnaire`, `useSubmitOnboarding`, `useAccount`, `useUploadDocument`, `usePortfolio`, `usePlans`, `useCreatePlan`, `useUpdatePlan`, `useQuote` (mutation), `useCreateDeposit`, `useDeposits`, `useDeposit`, `useNotifications`. `depositPollingInterval(deposit?: DepositDetail): number | false` → `30_000`, ou `false` em `invested` e `returned`.

- [ ] **Step 1: Testes que falham**

```ts
it("useConfig returns the mock config", ...);                         // liveMarkets ["AR"], minRecurringUsdCents 25000
it("useCreateDeposit sends the key it was given", ...);
it("refetches editorial data when the language changes", ...);        // usePortfolio: description em es, depois pt
it("polls a deposit every 30 s until it is invested or returned", () => {
  expect(depositPollingInterval({ ...d, state: "deposit_notified" })).toBe(30_000);
  expect(depositPollingInterval({ ...d, state: "invested" })).toBe(false);
  expect(depositPollingInterval({ ...d, state: "returned" })).toBe(false);
});
it("surfaces 401 session_expired when there is no token", ...);
```

- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(web): add auth and API providers, endpoints and query hooks`.

### Tarefa 8: Fixtures e cenários

**Estado:** existem `scenarios.ts` (os 8 `AccountStatus`, `market_not_live`, `maintenance`, `slow`, `server_error`), `scenario-state.ts`, `fixtures.ts` (config, Lucía, Rafael) e `db.ts` (config, me, latência, falha). Faltam os cenários de `DepositState`, os outros `BlockReason`, `empty`, `scenarioGroups` e o resto do banco (conta, carteira, planos, aportes, notificações, onboarding).

**Files:**
- Create: `src/mocks/fixtures/{config,people,portfolio,deposits,onboarding}.ts`, `src/mocks/scenarios.ts`, `src/mocks/scenario-state.ts`, `src/mocks/db.ts`
- Test: `src/mocks/scenarios.test.ts`

**Interfaces:**
- Produces: `ScenarioId` = cada `AccountStatus` + cada `DepositState` + cada `BlockReason` + `"slow" | "server_error" | "empty"` (26 ids, sem colisão); `scenarioGroups: { group: "account" | "deposit" | "block" | "network"; ids: ScenarioId[] }[]`; `DEFAULT_SCENARIO = "open"`; `buildMockDb(id: ScenarioId, now: Date): MockDb`; `currentScenario(): ScenarioId` (`?scenario=`, com `sessionStorage` só para o id, sem dados pessoais); `setScenarioForTests(id)`.
- `MockDb`: `{ config, me, account, portfolio, plans, deposits: DepositDetail[], notifications, onboarding, prefs, terms, latencyMs, failAll: boolean, quoteTtlSeconds, depositsByKey: Map<string, { body: string; deposit: DepositDetail }> }`.
- Regras dos cenários:
  - **AccountStatus X:** `me.accountStatus` e `account.status` = X. Antes de `open`: `blockReasons: ["ibkr_not_open"]`, sem aportes, carteira zerada. `action_required`: duas pendências `document`. `restricted`: aportes existentes mantidos, `blockReasons: ["ibkr_restricted"]` (decisão 14). `rejected`: sem pendências.
  - **DepositState X:** conta `open`; o primeiro aporte da lista (`id: "dep-scenario"`) está em X, com `history` coerente. Usa `ar_usdc`, exceto `fx_executed` e `wire_sent`, que usam `ar_swift` (no USDC esses estados ficam escondidos). `deposit_notified` traz instruções e `isFirstDeposit: true`. `returned` traz `returnReason` por idioma.
  - **BlockReason X:** `ibkr_not_open` → conta `ibkr_pending`; `ibkr_restricted` → `restricted`; `market_not_live` → `me.country: "BR"`, com `config.liveMarkets` ainda `["AR"]`; `compliance_hold` → `POST /deposits/quote` responde `409 compliance_hold`; `quote_expired` → cotação com TTL de 10 s e `POST /deposits` responde `409 quote_expired`; `pix_med_hold` → `blockReasons` e `Deposit.blockReason` (só faz sentido quando BR estiver ativo, documentado no cenário).
  - **Rede:** `slow` → latência de 3000 ms em toda rota; `server_error` → `500 internal` em toda rota `/api/v1`; `empty` → conta aberta sem aportes, planos, posições nem notificações.
- Fixtures: cliente fictícia "Lucía Fernández", CUIT válido `27-30123456-?` (dígito calculado na implementação, com teste), e-mail `lucia.fernandez@example.com`. ETFs UCITS de acumulação com ISIN `IE…` (por exemplo, `IE00B5BMR087` e `IE00BK5BQT80`). As descrições de ETF, pendências, questionário e `returnReason` existem em es/pt/en e são escolhidas pelo `Accept-Language`. `Portfolio.totalCents` = investido + caixa + trânsito (decisão 15).

- [ ] **Step 1: Testes que falham**

```ts
it("has 26 scenarios with unique ids", ...);
it.each(allScenarioIds)("%s builds a db whose payloads pass the schemas", (id) => {
  const db = buildMockDb(id, now);
  expect(meSchema.safeParse(db.me).success).toBe(true);
  // account, portfolio, cada deposit, plans, notifications, onboarding, questionnaire nos 3 idiomas
});
it.each(accountStatuses)("account scenario %s sets that status", ...);
it.each(depositStates)("deposit scenario %s puts dep-scenario in that state", ...);
it.each(blockReasons)("block scenario %s lists that reason", ...);   // quote_expired e compliance_hold verificados na Tarefa 9 pela resposta HTTP
it("portfolio total is invested + cash + in flight, without fees", ...);
it("fixture ISINs are Irish and the fixture CUIT is valid", ...);
```

- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(web): add realistic mock fixtures and selectable scenarios`.

### Tarefa 9: Handlers MSW

**Estado:** existe `createHandlers(getDb)` com `prepare()` (latência, falha, bearer) e as rotas `/health`, `/config`, `/me`, `/waitlist`; o worker lê `?scenario=` ao iniciar. Faltam as demais rotas.

**Files:**
- Modify: `src/mocks/handlers.ts` (vira `createHandlers(getDb: () => MockDb)`), `src/mocks/browser.ts`, `src/mocks/node.ts`, `src/setupTests.ts` (resetar o banco para `"open"` em `afterEach`), `.storybook/preview.tsx`
- Modify: `web/docs/api-gaps.md` (tudo o que for inventado aqui)
- Test: `src/mocks/handlers.test.ts`

**Interfaces:**
- Consumes: `buildMockDb`, `currentScenario` (Tarefa 8); `applyBasisPoints` (Tarefa 1).
- Rotas: todas as da seção 8, mais as do api-gaps.md: `POST /waitlist`, `POST /deposits/{id}/sent-notice`, `GET|PATCH /me/notifications`, `GET /account/terms`, `POST /account/terms/{id}/accept`, `POST /auth/logout`. Sem `Authorization` → `401 session_expired`.
- Cotação: `ar_usdc` cobra `rail_fee = max(applyBasisPoints(amount, 30), 100)`; `ar_swift` cobra `rail_fee = 3500`, estimado; `allocation_min = 0` (no piloto a OpenDollars paga, como diz a seção 12 do PRD). Valor abaixo de `minDepositUsdCents` (mock: `10000`, a confirmar) → `422 below_minimum`.
- `POST /deposits`: sem `Idempotency-Key` → `422 validation_failed`; mesma chave com o mesmo corpo → o mesmo aporte com `200`; mesma chave com corpo diferente → `409 idempotency_conflict`.
- `POST /plans`: `amountCents < 25000` → `422 below_minimum`; `dayOfMonth` fora de 1–28 ou sem `rail` → `422 validation_failed` com `fields` (decisão 16).

- [ ] **Step 1: Testes que falham** (`fetch` relativo contra o `server` do MSW, com `setScenarioForTests`):

```ts
it("rejects requests without a token with 401 session_expired", ...);
it("answers editorial content in the requested language", ...);              // GET /portfolio com Accept-Language pt
it("returns the same deposit for a repeated Idempotency-Key", ...);
it("rejects a reused key with a different body with 409 idempotency_conflict", ...);
it("quote_expired scenario: POST /deposits answers 409 quote_expired", ...);
it("compliance_hold scenario: POST /deposits/quote answers 409 compliance_hold", ...);
it("server_error scenario: every route answers 500 internal", ...);
it("empty scenario: deposits, plans and positions are empty", ...);
it("slow scenario: db latency is 3000 ms", ...);                             // lê db.latencyMs; sem esperar 3 s no teste
it("validates plans: minimum 25000, day 1–28, rail required", ...);
it("filters and paginates GET /deposits", ...);
```

- [ ] **Step 2–4:** FAIL → implementar (`delay(db.latencyMs)` do MSW antes de cada resposta) → PASS.
- [ ] **Step 5:** Commit `feat(web): serve the full API contract and api-gaps proposals from MSW`.

### Tarefa 10: Seletor de cenário flutuante (só dev)

**Estado:** nada existe ainda. Executar como escrito; a lista tem 27 cenários.

**Files:**
- Create: `src/mocks/ScenarioSwitcher.tsx`
- Modify: `src/App.tsx` (`import.meta.env.DEV && <Suspense><LazyScenarioSwitcher /></Suspense>`), `src/i18n/{es,pt,en}.json` (chaves `dev.scenarios.*`)
- Test: `src/mocks/ScenarioSwitcher.test.tsx`

**Interfaces:**
- Consumes: `scenarioGroups`, `currentScenario` (Tarefa 8).
- Comportamento: botão fixo no canto inferior esquerdo mostrando o cenário ativo. Ao abrir, aparece um `<select>` com os cenários agrupados por `optgroup`. Escolher um grava `?scenario=` na URL e recarrega. Usa só tokens.

- [ ] **Step 1: Testes que falham**

```ts
it("shows the active scenario and lists all 26 grouped", ...);
it("navigates to ?scenario=<id> when one is chosen", ...);   // window.location.assign espionado
```

- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Verificar o build de produção**

Run: `npm run build && grep -rl "ScenarioSwitcher\|scenario=\|Lucía\|mockServiceWorker" dist || echo clean`
Expected: `clean`

- [ ] **Step 6:** Rodar `npm run typecheck && npm run lint && npm test && npm run build && npm run size`; listar os cenários com a URL de cada um (`http://localhost:5173/?scenario=<id>`).
- [ ] **Step 7:** Commit `feat(web): add dev-only floating scenario switcher`.
