# Plano mensal (T5), Pendências (T11) e pendências de fases anteriores — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os placeholders de `/plan` e `/pendientes` pelas telas T5 e T11, ligar o atalho "Hora de tu aporte" ao T6 sem pôr o valor na URL, e fechar as cinco pendências das fases anteriores.

**Architecture:** As regras ficam em funções puras testadas antes das telas: valor mínimo por tipo de aporte (`deposits/rules.ts`), formulário e transições do plano (`plans/plan-rules.ts`) e agrupamento e ordem das pendências (`pending/pending-order.ts`). T5 é uma máquina de dois passos (formulário → revisão com CostTable → gravar), igual ao T6. T11 lê `GET /notifications` e dá a cada grupo a sua única ação, reaproveitando `DocumentUpload`, `Dialog`, `Banner` e `PageState`.

**Tech Stack:** React 19, React Router, TanStack Query 5, React Hook Form + Zod, i18next (namespaces sob demanda), Radix, MSW, Vitest, Storybook, Playwright.

**Spec:** `web/docs/prd-frontend.md` (seções 5, 7 T5/T6/T11, 10), `web/docs/decisions.md` (9, 10, 12, 14, 16), `web/docs/api-gaps.md` (itens 1, 2, 8, 10), `web/CLAUDE.md`, `web/docs/brand-brief.md`, `.claude/skills/frontend-design/SKILL.md` (subordinada ao brief).

## Global Constraints

- Mínimo recorrente de `config.minRecurringUsdCents`, trilhos de `config.railsByCountry` dos países em `liveMarkets`; nada fixo no front. `br_*` só com `"BR"` em `liveMarkets`.
- Dinheiro em centavos inteiros; valores em coluna em Inter `tabular-nums`; Fraunces só no total isolado.
- Nenhum plano gravado sem a prévia de custos visível. `Idempotency-Key` por intenção no `POST /plans` (`useIdempotencyKey`); botão desabilita após o clique.
- Valor do plano nunca na URL: `/aportar/nuevo?plan=<id>`, valor carregado por `GET /plans`.
- Uma ação primária por tela; nada de verde/vermelho de ganho/perda; sem ícone grande em estado vazio.
- Textos só em `src/i18n/locales/{es,pt,en}`; voseo; botões no infinitivo. `PendingItem.title`/`description` vêm traduzidos da API (decisão 12).
- TDD obrigatório nas Tarefas 1–4. Sem commits; mensagens sugeridas em inglês, Conventional Commits.

## Decisões que este plano toma (para você aprovar)

| # | Ponto em aberto | Decisão proposta |
|---|---|---|
| D1 | Prévia de custos do plano | `POST /deposits/quote` com `{ amountCents, planId? }` (já existe, api-gaps item 2) no passo de revisão; mostra a `CostTable` do trilho escolhido com a nota "Estimado: cada aporte usa la cotización del día". A validade da cotação não bloqueia gravar o plano (não é um aporte). |
| D2 | Fluxo de T5 | Sem plano: formulário → revisão → "Guardar plan" (POST). Com plano `active`/`paused`: resumo (valor em Inter `type-value-lg`, dia, trilho, próximo aporte) + ações. "Editar" abre o mesmo formulário preenchido → revisão → PATCH. Passos em estado de componente. |
| D3 | Ações por estado | `active`: Pausar (primária não; ghost), Editar (secondary), Cancelar (ghost, com Dialog). `paused`: Retomar (primary), Editar, Cancelar. `cancelled`: tratado como "sem plano" (formulário de criação, com nota "Tu plan anterior fue cancelado"). Pausar/retomar sem confirmação. |
| D4 | Qual plano mostrar | O primeiro não cancelado de `GET /plans`; se só houver cancelados, D3. |
| D5 | Conta bloqueada | Mesmo `accountBlock` do T6: `restricted`/`compliance_hold` substituem o formulário pela nota e suporte; um plano existente aparece só para leitura, sem ações. |
| D6 | Pendências: grupos e ordem | Grupos nesta ordem: `deposit_action`, `document`, `terms`, `notice` (o que mexe com dinheiro primeiro). Dentro do grupo: com `dueAt` antes, `dueAt` crescente; sem `dueAt`, `createdAt` decrescente; empate mantém a ordem da API. Prazo vencido → "Venció el …" em `amber-700` (aviso, não perda). |
| D7 | Ação por tipo | `deposit_action` com `depositId` → "Ver instrucciones" (`/aportar/:id`); com `planId` (lembrete "Hora de tu aporte") → "Hacer el aporte" (`/aportar/nuevo?plan=<id>`). `document` → "Enviar documento" abre `DocumentUpload` num `Sheet`. `terms` → "Revisar y aceptar" abre `Dialog` com o título e o link do documento (nova aba); a caixa de aceite, não marcada, só fica habilitada depois que o documento foi aberto, e "Aceptar" só depois de marcada; salva `{ id, version, acceptedAt }` via `POST /account/terms/{id}/accept`. `notice` → "Entendido" → `POST /notifications/{id}/read` e o item some. |
| D8 | Contrato novo | api-gaps: `Notification.planId?` (lembrete do plano), `Notification.termsId?` (qual documento aceitar; o front busca a versão em `GET /account/terms`), corpo `{ id, version, acceptedAt }` no `POST /account/terms/{id}/accept`, e `POST /notifications/{id}/read` → `204`. Mock implementa as quatro. |
| D9 | `?plan=` no T6 | `NewDepositScreen` lê `plan` da query, busca em `usePlans`, preenche o valor e envia `planId` na cotação; plano desconhecido, cancelado ou com valor abaixo do mínimo → ignora e começa vazio. O parâmetro sai da URL depois de lido (`replace`). |
| D10 | Saldo zero | `BalanceCard` com total 0: "US$ 0,00" em `type-value-lg` `text-cream-50` (sem Fraunces, sem dourado). |
| D11 | Botão de extratos | Texto encurtado para "Ver extractos en Interactive Brokers" (cabe em uma linha a 375 px); teste e2e mede a altura (≤ 48 px). |
| D12 | Namespaces | `plan` (T5) e `pending` (T11); `/pendientes` carrega `pending` + `account` (DocumentUpload) + `deposit`. |

## Review Focus

1. **Valor do plano digitado no formato de outro locale ou abaixo do mínimo:** erro no campo com a explicação dos custos fixos, nenhuma cotação. (Tarefa 1.)
2. **Clique duplo em "Guardar plan" ou repetição após erro de rede:** um único `POST /plans`, a repetição reusa a chave. (Tarefa 6.)
3. **`?plan=` de plano cancelado ou inexistente:** T6 começa vazio, sem erro e sem valor na URL. (Tarefa 8.)
4. **Pendência com prazo vencido e outra sem prazo no mesmo grupo:** a vencida primeiro, marcada. (Tarefa 3.)
5. **Balde negativo:** valor `-US$ 5,00`, participação 0,00 % e barra sem segmento negativo. (Tarefa 4.)

---

## Estrutura de arquivos

```
src/features/deposits/rules.ts (+ test)          amountSchema(config, locale, kind)
src/features/plans/plan-rules.ts (+ test)        planFormSchema, planRails, planActions, nextStatus, currentPlan
src/features/plans/PlanScreen.tsx, PlanForm.tsx, PlanReview.tsx, PlanSummary.tsx, PlanScreen.test.tsx, Plan.stories.tsx
src/features/pending/pending-order.ts (+ test)   groupPending, isOverdue
src/features/pending/PendingScreen.tsx, PendingItemAction.tsx, TermsAcceptDialog.tsx, PendingScreen.test.tsx, Pending.stories.tsx
src/features/portfolio/balances.ts (+ test), BalanceCard.tsx, PortfolioScreen.tsx
src/features/deposits/DepositHistory.tsx (chips), NewDepositScreen.tsx (?plan=)
src/api/endpoints.ts, hooks/account.ts (useAcceptTerms, useMarkNotificationRead), proposed-types.ts, schemas.ts
src/mocks/db.ts, handlers.ts, scenarios.ts (+ plan_paused, plan_reminder, terms_update)
src/i18n/locales/{es,pt,en}/{plan,pending}.json, index.ts, i18next.d.ts, router.tsx, placeholders.tsx
e2e/plan-pending.spec.ts, ../.gitignore, docs/api-gaps.md
```

---

### Task 1: Mínimo por tipo de aporte (TDD)

**Files:** `src/features/deposits/rules.ts`, `rules.test.ts`, chamadas em `NewDepositScreen.tsx`

**Interfaces:** Produces `amountSchema(config, locale, kind: "oneOff" | "recurring" = "oneOff")`.

- [ ] **Step 1: Testes que falham** — `kind: "recurring"` com `minRecurringUsdCents: 25000`: "249,99" → `belowMinimum`; "250" → `{ amountCents: 25000 }`; "1.000,5" (es) → `100050`; "1,000.50" (es) → `invalidAmount`. `oneOff` continua usando `minDepositUsdCents`.
- [ ] **Step 2:** `npx vitest run src/features/deposits/rules.test.ts` → FAIL. **Step 3:** implementar. **Step 4:** → PASS.

### Task 2: Regras do plano (TDD)

**Files:** Create `src/features/plans/plan-rules.ts`, `plan-rules.test.ts`

**Interfaces:**
- `planRails(config: AppConfig, country: Country): Rail[]` — trilhos do país se ele está em `liveMarkets`, `ar_usdc` primeiro; `[]` fora do piloto.
- `planFormSchema(config, locale, rails: readonly Rail[])` — `{ amount: string, dayOfMonth: number, rail: Rail }` → `CreatePlanRequest`; erros `belowMinimum | invalidAmount | invalidDay | invalidRail`.
- `type PlanAction = "pause" | "resume" | "edit" | "cancel"`; `planActions(status): PlanAction[]`; `nextStatus(status, action): Plan["status"] | null`.
- `currentPlan(plans: readonly Plan[]): Plan | undefined` (primeiro não cancelado).

- [ ] **Step 1: Testes que falham**
  - `planRails(config, "AR")` → `["ar_usdc", "ar_swift"]`; com `liveMarkets: ["AR"]`, `planRails(config, "BR")` → `[]`; com `"BR"` liberado → `["br_efx", "br_fxbank"]`.
  - Dia: `0`, `29`, `31`, `2.5` → `invalidDay`; `1` e `28` passam. Trilho fora da lista → `invalidRail`. Valor: os casos da Tarefa 1 com `recurring`.
  - `planActions("active")` → `["pause", "edit", "cancel"]`; `("paused")` → `["resume", "edit", "cancel"]`; `("cancelled")` → `[]`.
  - `nextStatus("active","pause")` → `"paused"`; `("paused","resume")` → `"active"`; `("active","cancel")` e `("paused","cancel")` → `"cancelled"`; `("active","resume")`, `("paused","pause")`, `("cancelled", qualquer)` → `null`; `edit` → mesmo status.
  - `currentPlan([cancelado, pausado, ativo])` → o pausado; só cancelados → `undefined`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.

### Task 3: Ordem das pendências (TDD)

**Files:** Create `src/features/pending/pending-order.ts`, `pending-order.test.ts`

**Interfaces:** `pendingKinds = ["deposit_action","document","terms","notice"] as const`; `groupPending(items: readonly Notification[]): { kind: PendingItem["kind"]; items: Notification[] }[]` (sem grupos vazios); `isOverdue(item, now: Date): boolean`.

- [ ] **Step 1: Testes que falham**
  - Grupos na ordem de `pendingKinds`, mesmo com a API mandando `notice` primeiro; grupo vazio não aparece.
  - Dentro do grupo: `dueAt` 3/nov antes de 10/nov; com `dueAt` antes de sem `dueAt`; sem `dueAt` por `createdAt` decrescente; empate total mantém a ordem recebida; não muta a entrada.
  - `isOverdue` true só com `dueAt` < now; sem `dueAt` → false; compara instantes com fuso diferente.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.

### Task 4: Balde negativo (TDD)

**Files:** `src/features/portfolio/balances.ts`, `balances.test.ts`

- [ ] **Step 1: Testes que falham** — `bucketShares({ invested: 100000, cash: -500, inFlight: 0 })` → `{ invested: 10000, ibkrCash: 0, inFlight: 0 }`; só negativos → todos 0; soma = 10000 sempre que houver balde positivo (propriedade com sorteio incluindo negativos). `bucketsTotalCents` continua somando o negativo (`99500`). Teste de tela: a linha mostra `-US$ 5,00` e "0,00 % del total".
- [ ] **Step 2:** FAIL → **Step 3:** participações e barra usam só os baldes positivos → **Step 4:** PASS.

### Task 5: Contrato, mock, textos e rotas

**Files:** `src/api/{proposed-types,schemas,endpoints}.ts`, `src/api/hooks/account.ts`, `src/mocks/{db,handlers,scenarios}.ts` + testes, `docs/api-gaps.md`, `src/i18n/**`, `src/router.tsx`, `src/features/placeholders.tsx`, `../.gitignore`

- Produces: `useAcceptTerms()` (`{ id, version, acceptedAt }`), `useMarkNotificationRead()`, ambos invalidando `notifications` e `account`. `Notification` com `planId?`, `termsId?`.
- [ ] Testes do mock: aceite com corpo válido → `204` e a pendência some; corpo sem `version` → `422`; `POST /notifications/{id}/read` → `204` e o item some; cenários `plan_paused` (plano pausado), `plan_reminder` (pendência `deposit_action` com `planId`), `terms_update` (termo com versão nova e pendência `terms` com `termsId`). Contagem de cenários atualizada.
- [ ] Rotas `/plan` e `/pendientes` reais; placeholders `PlanScreen` e `PendingScreen` removidos; paridade de chaves dos namespaces `plan` e `pending`. `.playwright-mcp/` no `.gitignore` da raiz.

### Task 6: T5 — Plano mensal

**Files:** Create `PlanScreen.tsx`, `PlanForm.tsx`, `PlanReview.tsx`, `PlanSummary.tsx`, `PlanScreen.test.tsx`, `Plan.stories.tsx` em `src/features/plans/`.

Layout (375 px): h1 "Plan mensual"; uma frase sobre a janela e o aviso "Hora de tu aporte" (type-body gray-600, até 2 linhas); conteúdo de D2. Formulário: `Field` + `Input` do valor (mesmo do T6, com a ajuda dos custos fixos), `Select` do dia (1–28), `RadioCard` dos trilhos; botão primário "Continuar". Revisão: `CostTable` com `netRow`, nota de estimativa, primário "Guardar plan" e ghost "Volver". Resumo: ledger com Valor, Día, Medio de envío, Próximo aporte; ações de D3; `RiskNote` (seção 10). Cancelar: `Dialog` com "Cancelar plan" (destructive) e "Volver".

- [ ] **Step 1: Testes que falham** — criar plano: "200" mostra a explicação do mínimo e não cota; "500", dia 10, USDC → revisão com a tabela → "Guardar plan" faz um `POST /plans` com `Idempotency-Key` e corpo `{ amountCents: 50000, dayOfMonth: 10, rail: "ar_usdc" }`; clique duplo → um POST. Trilho padrão `ar_usdc`; sem `br_*`. Pausar → `PATCH {status:"paused"}` sem diálogo; Retomar idem; Cancelar abre o Dialog e só manda `PATCH {status:"cancelled"}` ao confirmar; Editar preenche o formulário e grava com PATCH. Conta `restricted` → nota e nenhuma ação. Carregando, erro com Reintentar.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; stories `Empty`, `Creating`, `Review`, `Active`, `Paused`, `CancelDialog`, `Editing`, `Restricted`, `Loading`, `LoadError` → **Step 4:** PASS.

### Task 7: T11 — Pendências

**Files:** Create `PendingScreen.tsx`, `PendingItemAction.tsx`, `TermsAcceptDialog.tsx`, `PendingScreen.test.tsx`, `Pending.stories.tsx` em `src/features/pending/`.

Layout: h1 "Pendientes"; um `h2` por grupo (type-heading); itens como linhas de extrato: título (type-label), descrição (type-caption gray-600, 2 linhas), prazo (type-caption tabular; vencido em amber-700), uma ação à direita/abaixo. Vazio: filete graphite, "Estás al día" (type-heading) e uma frase tranquilizadora, sem ícone.

- [ ] **Step 1: Testes que falham** — agrupa e ordena (D6); cada item tem exatamente um controle de ação; `deposit_action` linka `/aportar/:id`; lembrete do plano linka `/aportar/nuevo?plan=plan-1` e o link não contém o valor; documento abre o envio e, ao concluir, o item some; termos: sem abrir o documento a caixa fica desabilitada e nenhum POST sai; depois de abrir, "Aceptar" fica desabilitado até marcar a caixa e envia `{ id, version, acceptedAt }` com ISO UTC; aviso "Entendido" some da lista; prazo vencido mostra "Venció el"; vazio mostra "Estás al día"; erro com Reintentar.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; stories `Grouped`, `Overdue`, `TermsDialog`, `DocumentSheet`, `PlanReminder`, `Empty`, `Loading`, `LoadError` → **Step 4:** PASS.

### Task 8: "Hora de tu aporte" no T6 e ajustes visuais pendentes

**Files:** `NewDepositScreen.tsx` + teste, `BalanceCard.tsx`, `PortfolioScreen.tsx`, `DepositHistory.tsx`, `locales/*/portfolio.json`, testes de tela.

- [ ] **Step 1: Testes que falham** — `/aportar/nuevo?plan=plan-1` preenche "500" e a cotação leva `planId: "plan-1"`; depois de ler, a URL fica `/aportar/nuevo` sem query; `?plan=nope` e plano cancelado → campo vazio. Saldo zero: nenhum `.type-value-display`, nenhum `text-gold-500`, "US$ 0,00" visível. Chips: classe `rounded-control`, nenhuma `rounded-full`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (D9, D10, D11, chips) → **Step 4:** PASS.

### Task 9: Verificação, design e revisão

- [ ] E2E `e2e/plan-pending.spec.ts` a 375 px: criar plano → pausar → retomar → cancelar (Dialog); pendências: aceitar termo; lembrete abre T6 preenchido sem valor na URL; botão de extratos com altura ≤ 48 px em ES, PT e EN (capturas a 375 px nos três idiomas); nenhum scroll horizontal.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run size && npx playwright test`.
- [ ] Capturas a 375/1280 de cada estado de T5 e T11; revisão contra o brief e a frontend-design; corrigir o que for grave/médio.
- [ ] `/code-review` no diff da fase; corrigir grave/médio; repetir a verificação.
- [ ] Relatório com arquivos por grupo e mensagens Conventional Commits em inglês.
