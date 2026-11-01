# Início (T4), Carteira (T9) e Histórico (T10) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os placeholders de `/inicio` e `/cartera` pelas telas T4 e T9 e colocar o histórico de aportes (T10) dentro de `/aportar`, abaixo dos aportes em curso.

**Architecture:** As contas ficam em funções puras testadas antes das telas: saldo por balde e participação de cada balde (`features/portfolio/balances.ts`), peso atual vs. peso-alvo (`features/portfolio/weights.ts`), filtros e ordem do histórico (`features/deposits/history.ts`) e próxima janela (`features/home/investment-window.ts`). As telas usam só os hooks que já existem (`usePortfolio`, `usePlans`, `useAccount`, `useDeposits`, `useConfig`) e os componentes `Money`, `Ledger`, `Banner`, `Card`, `RiskNote`, `PageState`. T8 já existe; o histórico só linka para ele.

**Tech Stack:** React 19, React Router, TanStack Query 5, i18next (namespaces sob demanda), MSW, Vitest + Testing Library, Storybook, Playwright.

**Spec:** `web/docs/prd-frontend.md` (seções 5 "Saldos", 6, 7 T4/T8/T9/T10, 10), `web/docs/decisions.md` (12, 13, 14, 15), `web/docs/api-gaps.md` (itens 2 `GET /deposits`, 8 `Portfolio.totalCents`, 10), `web/CLAUDE.md`.

## Global Constraints

- Dinheiro em centavos inteiros; soma só com `sumCents`; formatação só com `Money`/`formatMoney`.
- `Portfolio` total = investido + caixa + trânsito; `feesPaidCents` fora do total, em linha secundária (decisão 15).
- Fraunces (`Money size="display"`) **só** no número isolado do total, em T4 e T9. Colunas, listas, ledgers e cartões: `Money` inline (Inter `tabular-nums`).
- Nenhuma cor de ganho/perda: nada de verde/vermelho/âmbar em valores, pesos ou barras. Barras em `navy-900` sobre `gray-200`; marcador de alvo em `graphite-900`. Não existe rentabilidade no piloto.
- Sem gráfico de rentabilidade; data e hora de `asOf` sempre visível em T4 e T9.
- Estados por texto amigável (`deposit.state.*`), nunca o código; `ar_usdc` + `partner_collected` = "USDC recibido".
- Textos só em `src/i18n/locales/{es,pt,en}`; ES com voseo; botões no infinitivo. `Position.description` vem da API (decisão 12).
- Janela de investimento a partir de `config.investmentWindowDay`; nenhuma constante.
- Link de extratos: `config.ibkrPortalUrl`, `target="_blank" rel="noopener noreferrer"`.
- Aviso de risco (`RiskNote`) em T9. Nada de dado pessoal na URL (filtro do histórico em estado de componente).
- TDD obrigatório nas Tarefas 1–4. Sem commits: ao fim, arquivos por assunto + mensagem sugerida.
- Os skills `frontend-design` e `test-driven-development` do Superpowers não estão carregados nesta sessão: o TDD segue o ciclo vermelho → verde → refatorar descrito aqui, e o visual segue `brand-brief.md` + `CLAUDE.md` (estilo extrato: ledger, filetes, muito respiro).

## Decisões que este plano toma (para você aprovar)

| # | Ponto em aberto | Decisão proposta |
|---|---|---|
| D1 | Qual total mostrar | O total exibido é `bucketsTotalCents(buckets)`. Se divergir de `portfolio.totalCents`: `console.warn` em dev e `reportIssue("portfolio_total_mismatch")` (ponto de log para o monitoramento, sem valores nem dados pessoais), com `TODO(decisão)`. |
| D2 | "Divisão" do saldo | Cada balde com valor e participação em pontos-base inteiros pelo método do maior resto (somam exatamente 100,0 %). Em T9, uma barra proporcional fina de três tons de marinho/cinza, sem verde. Em T4, só a linha de texto "investido · en caja · en tránsito". |
| D3 | Peso | `weight` e `targetWeight` da API viram pontos-base inteiros (`Math.round(r × 10000)`), limitados a 0–10000 só na barra; o texto mostra o valor real. Texto "58,1 % · objetivo 60,0 %", sem "acima/abaixo" e sem cor. |
| D4 | Filtro do histórico | Só finalizados: `all` (`invested`+`returned`), `invested`, `returned`. Chips de rádio. `GET /deposits?state=` aceita lista separada por vírgula (api-gaps item 2); "En curso" pede os não finalizados pela mesma lista. |
| D5 | O que entra no histórico | Sem duplicação: "En curso" = não finalizados; histórico = só `invested`/`returned`, mais recentes primeiro, "Ver más". Vazio com `all` → EmptyState com CTA "Hacer un aporte"; vazio com outro filtro → frase + "Ver todos". |
| D6 | Próxima janela | Ordem: `config.nextInvestmentWindow` (proposto em api-gaps) → `Deposit.nextInvestmentWindow` de um aporte em curso → cálculo local `nextInvestmentWindow(now, day)` (UTC; dia > mês → último dia). Sempre só a data. `TODO(decisão)`: fuso. |
| D7 | Cartão "Próximo aporte" | Plano `active` → data `nextRunAt` + valor; `paused` → "Plan pausado" + link ao plano; sem plano → "Todavía no tenés un plan mensual" + link "Crear plan" (`/plan`, placeholder até T5). |
| D8 | Cartão "Aportes en curso" | Até 3 aportes não finalizados, estado amigável + valor, cada um linka T8; "Ver todos" vai a `/aportar`. Nenhum → "No tenés aportes en curso". |
| D9 | Faixa de pendências | `account.pending.length > 0` → `Banner` info com contagem e link "Ver pendientes". Conta `restricted` → `Banner` warning com o texto que T6 já usa (decisão 14). |
| D10 | Carteira só em trânsito | Sem posições e com trânsito/caixa > 0: no lugar da lista, a nota "Tu dinero se invierte en la próxima ventana, el {{date}}". Tudo zero → EmptyState com CTA "Hacer un aporte". |
| D11 | Namespaces | Novo namespace `portfolio` (T4 + T9). `area()` aceita lista de namespaces; `/inicio` carrega `portfolio` + `deposit` (rótulos de estado). |
| D12 | Rótulo do estado | `stateLabelKey(deposit)` sai de `deposit-timeline.ts` e é usado por T4, T10 e pela lista em curso (corrige a lista atual, que mostra "Recibimos tu dinero" no USDC). |

## Review Focus

1. **Arredondamento das participações:** 1/3 + 1/3 + 1/3 tem de somar 100,0 %, nunca 99,9 % ou 100,1 %. (Tarefa 1, `bucketShares` com 3 baldes iguais.)
2. **Total zero:** carteira vazia não divide por zero; participações todas 0 e barra oculta. (Tarefa 1.)
3. **Peso fora de 0–1 vindo da API** (ex.: 1.02 por arredondamento da IBKR): a barra não estoura a largura; o texto mostra 102,0 %. (Tarefa 2.)
4. **Troca de filtro com páginas carregadas:** o filtro novo começa da primeira página e não mistura itens do anterior. (Tarefa 3 + teste de tela na Tarefa 8.)
5. **Janela no dia 31 em fevereiro, e no próprio dia da janela:** 28/29 de fevereiro; no dia, hoje. (Tarefa 4.)

---

## Estrutura de arquivos

```
src/features/portfolio/
  balances.ts / balances.test.ts      bucketsTotalCents, bucketShares
  weights.ts / weights.test.ts        weightComparison
  PortfolioScreen.tsx                 T9
  BalanceSplit.tsx                    ledger dos baldes + barra proporcional (T9)
  PositionList.tsx                    posições, peso, descrição expansível
  PortfolioScreen.test.tsx, Portfolio.stories.tsx
src/features/home/
  investment-window.ts / .test.ts     nextInvestmentWindow
  HomeScreen.tsx                      T4 (cartões no mesmo arquivo)
  HomeScreen.test.tsx, Home.stories.tsx
src/features/deposits/
  history.ts / history.test.ts        historyFilters, statesFor, newestFirst, isInProgress
  DepositHistory.tsx                  T10
  deposit-timeline.ts                 + stateLabelKey
  DepositsHome.tsx                    + <DepositHistory/>
src/api/endpoints.ts, hooks/deposits.ts, query-keys.ts   states[]
src/mocks/handlers.ts, db.ts, scenarios.ts               states=a,b; cenário in_flight_only
src/i18n/locales/{es,pt,en}/portfolio.json (+ deposit.json history.*)
src/i18n/index.ts, src/router.tsx, src/features/placeholders.tsx
e2e/home-portfolio.spec.ts
docs/api-gaps.md
```

---

### Task 1: Saldo por balde (TDD)

**Files:** Create `src/features/portfolio/balances.ts`, `src/features/portfolio/balances.test.ts`

**Interfaces:**
- Produces: `type Bucket = "invested" | "ibkrCash" | "inFlight"`; `bucketsTotalCents(buckets: Portfolio["buckets"]): number`; `bucketShares(buckets: Portfolio["buckets"]): Record<Bucket, number>` (pontos-base inteiros).

- [ ] **Step 1: Testes que falham**
  - `bucketsTotalCents({ investedCents: 120000, ibkrCashCents: 31200, inFlightCents: 50000, feesPaidCents: 450 })` → `201200` (fees fora).
  - Valores grandes: `investedCents: 900_000_000_00` soma exata (sem float).
  - `bucketsTotalCents` com `inFlightCents: 0.5` lança `TypeError` (via `sumCents`).
  - `bucketShares` 1/1/1 centavo → `{ invested: 3334, ibkrCash: 3333, inFlight: 3333 }` e a soma é `10000`; empate do resto desempata na ordem invested → ibkrCash → inFlight.
  - `bucketShares` só trânsito `50000` → `{ invested: 0, ibkrCash: 0, inFlight: 10000 }`.
  - `bucketShares` tudo zero → todos `0`.
  - Propriedade: para 200 combinações aleatórias de inteiros, soma = `10000` quando total > 0.
- [ ] **Step 2:** `npx vitest run src/features/portfolio/balances.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar. Maior resto em inteiros: `floor(part × 10000 / total)` e distribuir o que falta pelos maiores restos `(part × 10000) % total`.
- [ ] **Step 4:** Mesmo comando → PASS.

### Task 2: Peso atual vs. peso-alvo (TDD)

**Files:** Create `src/features/portfolio/weights.ts`, `weights.test.ts`

**Interfaces:**
- Produces: `weightComparison(weight: number, targetWeight: number): { currentBp: number; targetBp: number; barBp: number; markerBp: number }` — `barBp`/`markerBp` limitados a 0–10000; `currentBp`/`targetBp` não limitados. Não finito → `0`.

- [ ] **Step 1: Testes que falham**
  - `(0.6, 0.6)` → `{ currentBp: 6000, targetBp: 6000, barBp: 6000, markerBp: 6000 }`.
  - `(0.58125, 0.6)` → `currentBp: 5813` (meio para cima).
  - `(1.02, 1)` → `currentBp: 10200, barBp: 10000`.
  - `(-0.01, 0.1)` → `barBp: 0`, `currentBp: -100`.
  - `(NaN, 0.3)` → `currentBp: 0, barBp: 0`.
- [ ] **Step 2:** `npx vitest run src/features/portfolio/weights.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. Exibição em tela com `formatPercent(bp / 10000, locale)` (já existe).
- [ ] **Step 4:** → PASS.

### Task 3: Filtros e ordem do histórico (TDD) + API com lista de estados

**Files:** Create `src/features/deposits/history.ts`, `history.test.ts`. Modify `deposit-timeline.ts` (+ `stateLabelKey`), `deposit-timeline.test.ts`, `src/api/endpoints.ts:103`, `src/api/hooks/deposits.ts` (`useDeposits`), `src/api/query-keys.ts:12`, `src/mocks/handlers.ts:361`, `src/mocks/handlers.test.ts`, `src/api/hooks/hooks.test.tsx`, `docs/api-gaps.md`.

**Interfaces:**
- Produces: `historyFilters = ["all","invested","returned"] as const`; `type HistoryFilter`; `statesFor(filter): readonly DepositState[]`; `inProgressStates: readonly DepositState[]`; `newestFirst<T extends { createdAt: string }>(items: readonly T[]): T[]` (estável); `isInProgress(deposit: { state: DepositState }): boolean`; `stateLabelKey(deposit: Pick<DepositDetail,"rail"|"state">)`.
- `useDeposits({ states?: readonly DepositState[] })`; `queryKeys.deposits(states?)`; `getDeposits(api, { states, cursor })` envia `state=a,b`.

- [ ] **Step 1: Testes que falham**
  - `statesFor("all")` → `["invested","returned"]`; `statesFor("invested")` → `["invested"]`; `inProgressStates` = `deposit_notified`…`broker_credited` (sem `kyc_passed`/`ibkr_open`, sem finalizados).
  - `newestFirst` com três datas fora de ordem → decrescente; empate de `createdAt` mantém a ordem recebida; não muta a entrada.
  - `isInProgress` false para `invested` e `returned`, true para os demais.
  - `stateLabelKey({ rail: "ar_usdc", state: "partner_collected" })` → `"deposit.state.partner_collected_usdc"`; `ar_swift` → `"deposit.state.partner_collected"`.
  - Mock: `GET /deposits?state=invested,returned` só devolve esses; estado inválido na lista → `422 validation_failed`.
  - Hook: `useDeposits({ states: ["invested"] })` pede `?state=invested`; chaves diferentes por lista.
- [ ] **Step 2:** `npx vitest run src/features/deposits src/mocks src/api/hooks` → FAIL.
- [ ] **Step 3:** Implementar; `timeline` passa a usar `stateLabelKey`. api-gaps item 2/10: `state` aceita lista separada por vírgula.
- [ ] **Step 4:** → PASS.

### Task 4: Próxima janela de investimento (TDD)

**Files:** Create `src/features/home/investment-window.ts`, `investment-window.test.ts`

**Interfaces:** Produces `nextInvestmentWindow(now: Date, day: number): string` (ISO `YYYY-MM-DDT00:00:00.000Z`).

- [ ] **Step 1: Testes que falham** — `(2026-10-03, 5)` → `2026-10-05`; `(2026-10-05, 5)` → `2026-10-05`; `(2026-10-06, 5)` → `2026-11-05`; `(2026-12-20, 5)` → `2027-01-05`; `(2027-02-01, 31)` → `2027-02-28`; `(2028-02-01, 31)` → `2028-02-29`; `(2026-01-31T23:30-03:00, 31)` usa a data UTC (`2026-02-28`).
- [ ] **Step 2:** → FAIL. **Step 3:** implementar com `Date.UTC`. **Step 4:** → PASS.

### Task 5: Namespace `portfolio`, rotas e cenário de mock

**Files:** `src/i18n/index.ts` (+ `portfolio`), `src/i18n/locales/{es,pt,en}/portfolio.json`, `src/i18n/i18next.d.ts`, `src/router.tsx` (`area()` com `Namespace | Namespace[]`; `/inicio` e `/cartera` reais), `src/features/placeholders.tsx` (remove `HomeScreen`, `PortfolioScreen`), `src/mocks/scenarios.ts` (+ `in_flight_only`, grupo `portfolio`), `src/mocks/db.ts` (cenário: sem posições, `inFlightCents: 50000`, caixa 0, um aporte `partner_collected`), `src/mocks/scenarios.test.ts`, `src/router.test.tsx`.

- [ ] **Step 1:** Testes: o cenário `in_flight_only` responde `positions: []` e `bucketsTotalCents` = `inFlightCents`; `router.test` encontra o heading de T4 em `/inicio` e de T9 em `/cartera`; o teste de paridade de chaves entre `es/pt/en` (já existe para os outros namespaces) cobre `portfolio`.
- [ ] **Step 2:** FAIL → implementar → PASS. Textos em ES com voseo, PT e EN; `asOf` explicado: "Actualizado diariamente a partir de Interactive Brokers. Última actualización: {{date}}." — `TODO(compliance)` na explicação.

### Task 6: T9 — Carteira

**Files:** Create `PortfolioScreen.tsx`, `BalanceSplit.tsx`, `PositionList.tsx`, `PortfolioScreen.test.tsx`, `Portfolio.stories.tsx` em `src/features/portfolio/`.

**Interfaces:** Consumes Tarefas 1, 2, 4; `usePortfolio`, `useConfig`.

Layout (375 px, de cima para baixo): título; rótulo "Total" + `Money size="display"` (único Fraunces numérico); `asOf`; `BalanceSplit` = barra proporcional 4 px (D2) + `Ledger` com Invertido / En caja en Interactive Brokers / En tránsito (valor inline + % em caption), e abaixo do ledger a linha secundária `type-caption` "Costos pagados: US$ 4,50 (no forman parte del total)"; seção "Posiciones": cada posição como bloco de extrato — nome (`type-label`), ISIN e "N acciones" em caption `tabular-nums`, valor à direita, barra de peso 2 px com marcador do alvo e o texto de D3, `<details>` "Qué es este fondo" com `description`; nota de D10 quando cabível; link "Ver extractos oficiales en Interactive Brokers"; `RiskNote`.

- [ ] **Step 1: Testes que falham** (MSW + `renderApp`)
  - Carteira completa: total = soma dos baldes formatada; três linhas de balde; custos fora do total; uma linha por posição com ISIN e ações; `asOf` formatado; link com `href` de `config.ibkrPortalUrl` e `rel` com `noopener`; texto de risco.
  - A descrição fica fechada e abre ao clicar em "Qué es este fondo".
  - Barra de peso: `aria-hidden`; o texto acessível tem atual e objetivo.
  - Nenhum elemento com classe `text-green-*`, `text-brick-*`, `bg-green-*`, `bg-brick-*` na tela (guarda contra cor de ganho/perda).
  - Só em trânsito (`in_flight_only`): sem lista, nota com a data da próxima janela.
  - Vazia (`empty`): EmptyState com link para `/aportar/nuevo`.
  - Erro: `ErrorState` e "Reintentar" refaz o pedido. Carregando: `LoadingState`.
- [ ] **Step 2:** `npx vitest run src/features/portfolio` → FAIL.
- [ ] **Step 3:** Implementar. Stories: `Full`, `InFlightOnly`, `Empty`, `Loading`, `Error`.
- [ ] **Step 4:** → PASS.

### Task 7: T4 — Início

**Files:** Create `src/features/home/HomeScreen.tsx`, `HomeScreen.test.tsx`, `Home.stories.tsx`.

**Interfaces:** Consumes `bucketsTotalCents`, `nextInvestmentWindow`, `stateLabelKey`, `isInProgress`, `newestFirst`; hooks `usePortfolio`, `usePlans`, `useAccount`, `useDeposits`, `useConfig`.

Layout: faixa de pendências/restrição no topo (D9); "Total" + `Money` display; logo abaixo uma linha `type-caption tabular-nums` "Invertido US$ … · En caja US$ … · En tránsito US$ …" (quebra em até três linhas em 320 px); `asOf` com data e hora; três `Card` empilhados: Próximo aporte (D7), Aportes en curso (D8), Próxima ventana de inversión (data de D6 + frase "El dinero que llega antes se invierte ese día; mientras tanto queda en tu cuenta en Interactive Brokers."). Cada cartão carrega e falha sozinho (skeleton/erro por cartão), o total usa o estado de `usePortfolio`.

- [ ] **Step 1: Testes que falham**
  - Total e as três partes; `asOf` com hora.
  - Plano ativo mostra `nextRunAt` e valor; sem plano mostra "Crear plan" para `/plan`; pausado mostra "Plan pausado".
  - Em curso: `ar_usdc` em `partner_collected` mostra "USDC recibido"; no máximo 3; cada um linka `/aportar/:id`.
  - Janela: data calculada de `config.investmentWindowDay` com `now` fixo (`vi.setSystemTime`).
  - Pendências: com `action_required`-like (`account.pending` com 2 itens) aparece "2 pendientes" e link `/pendientes`; sem pendências, nenhuma faixa; `restricted` mostra o aviso.
  - Nenhum elemento `type-value-display` além do total.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; stories `Full`, `InFlightOnly`, `Empty`, `WithPending`, `Restricted`, `Loading`, `Error` → **Step 4:** PASS.

### Task 8: T10 — Histórico dentro de `/aportar`

**Files:** Create `src/features/deposits/DepositHistory.tsx`, `DepositHistory.test.tsx`. Modify `DepositsHome.tsx` (usa `stateLabelKey`, remove `historyLater`, renderiza `<DepositHistory/>` abaixo de "En curso"), `deposit.json` (`deposit.history.*`), `Deposits.stories.tsx`.

Layout: `h2` "Historial"; chips de filtro roláveis na horizontal sem scroll da página (D4); lista em ledger: data (`formatDate`, caption) e estado amigável à esquerda, valor inline à direita, chevron; "Ver más" quando `hasNextPage`; vazio conforme D5.

- [ ] **Step 1: Testes que falham**
  - Ordem decrescente por `createdAt`.
  - Escolher "Devueltos" pede `?state=returned` e mostra só esses; "En camino" pede os quatro estados; voltar a "Todos" não mostra itens do filtro anterior durante a troca.
  - Clicar num item navega para `/aportar/:id` (T8 renderiza).
  - "Ver más" carrega a segunda página (mock com `limit` pequeno).
  - Vazio sem filtro: CTA "Hacer un aporte" → `/aportar/nuevo`. Vazio com filtro: "Ver todos" volta a `all`.
  - Erro com "Reintentar".
- [ ] **Step 2:** FAIL → **Step 3:** implementar; stories `HistoryFull`, `HistoryFiltered`, `HistoryEmpty`, `HistoryError` → **Step 4:** PASS.

### Task 9: E2E, verificação e revisão

**Files:** Create `e2e/home-portfolio.spec.ts`.

- [ ] **Step 1:** E2E: entrar no cenário `open` → `/inicio` mostra total e cartões → tocar "Cartera" mostra posições → "Aportar" mostra histórico, filtrar "Invertidos", abrir um item (T8). Viewport 375 px sem scroll horizontal.
- [ ] **Step 2:** `npm run typecheck && npm run lint && npm test && npm run build` e `npx playwright test e2e/home-portfolio.spec.ts` → tudo verde. Conferir o tamanho do bundle inicial (não pode crescer: as telas são `lazy`).
- [ ] **Step 3:** Ver as telas no navegador (Playwright MCP) a 375 px e 1280 px, nos cenários `open`, `in_flight_only`, `empty`.
- [ ] **Step 4:** Rodar `/code-review` sobre o diff da fase inteira; corrigir achados graves e médios; rodar a verificação do Step 2 de novo.
- [ ] **Step 5:** Relatório: arquivos alterados por assunto e mensagem de commit sugerida para cada grupo (sem commit).
