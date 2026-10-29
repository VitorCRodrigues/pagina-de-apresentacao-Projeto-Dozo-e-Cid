# Onboarding (T2) e status da conta (T3) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os placeholders de `/onboarding` e `/cuenta` pelo assistente de 8 etapas com rascunho no servidor (T2) e pela tela de status da conta para os 8 `AccountStatus` (T3).

**Architecture:** Cada etapa é uma rota `/onboarding/:slug` com um formulário React Hook Form + um schema Zod próprio (`features/onboarding/schemas.ts`). Um layout de assistente lê `GET /onboarding`, decide a etapa de retomada (`features/onboarding/steps.ts`), desenha o Stepper e o rodapé fixo, e salva cada etapa com `useSaveOnboardingStep`. O T3 deriva a linha do tempo de `AccountStatus` por uma função pura e envia documentos por um `upload` com progresso (XHR) no cliente HTTP.

**Tech Stack:** React 19, React Router 8, TanStack Query 5, React Hook Form 7 + Zod 4.6, Radix (Slider, Checkbox, RadioGroup), i18next, MSW 3, Vitest, Playwright, Storybook 10.

**Spec:** `web/docs/prd-frontend.md` (seção 7, T2 e T3; seções 8 e 10), `web/docs/decisions.md` (itens 9, 11, 12, 14, 17), `web/docs/api-gaps.md` (itens 1, 2, 10), `web/CLAUDE.md`.

## Global Constraints

- Tipos e nomes de `src/api/types.ts` sem mudança; o que for novo vai para `proposed-types.ts` **e** para o `api-gaps.md`.
- Ordem das etapas exatamente a de `onboardingSteps`: `residence, personal, address, suitability, funds, identity, terms, review`.
- Nenhuma pergunta de suitability no código: rótulos, opções e limites vêm de `GET /onboarding/questionnaire`.
- Nenhum texto fixo em componente; tudo em `src/i18n/{es,pt,en}.json`, ES com voseo, botões no infinitivo ("Continuar", "Volver", "Enviar solicitud").
- Nenhuma instrução de depósito em T2 ou T3 (nem texto, nem link para `/aportar`).
- Prazo sempre "costuma levar alguns dias úteis" (decisão 17); nunca "minutos" nem "KYC em minutos" (decisão 11).
- Tom: a conta é aberta na Interactive Brokers, no nome do cliente; a OpenDollars é a consultora (PRD seção 10).
- Dados pessoais só em memória e no servidor: nada em `localStorage`/`sessionStorage`, URL ou `console`.
- Textos jurídicos e links de termos são placeholders com `TODO(compliance)`; escolhas não definidas levam `TODO(decisão)`.
- Visual: linguagem de extrato já aplicada (réguas, Ledger, Banner como nota, sem cartões decorativos); um foco e uma ação primária por tela; 375 px; AA; `prefers-reduced-motion`.
- TDD obrigatório nas tarefas 2, 3, 4, 6 e 11 (validação e retomada). Commits não se aplicam (`web/CLAUDE.md`): ao fim, lista de arquivos por assunto com mensagem sugerida.

## Decisões que este plano toma (para você aprovar)

| # | Ponto em aberto | Decisão proposta |
|---|---|---|
| D1 | Faixas de renda e patrimônio | **Ajustado em 29/10:** sem tipo `range`. Faixas são perguntas `single` com opções fechadas vindas da API. O tipo `number` sai do contrato: `kind` é `single` ou `multi`. |
| D2 | Significado de `currentStep` | Primeira etapa ainda não salva. `PUT /onboarding/{step}` avança para a etapa seguinte e nunca volta (editar a partir da Revisão não regride). |
| D3 | Lista de espera para país fora da Argentina | Reaproveitar o formulário do `NotAvailableScreen` (extraído para `WaitlistForm`). `WaitlistRequest.country` passa de `Country` para código ISO 3166-1 alfa-2 (`string`). |
| D4 | Aceite dos termos no onboarding | Os documentos vêm de `GET /account/terms`; o aceite é salvo no rascunho (`PUT /onboarding/terms` com `{ accepted: [{ id, version, acceptedAt }] }`), formato registrado no `api-gaps.md`, e o backend registra no envio. |
| D5 | Upload com progresso | `fetch` não informa progresso de envio: o cliente ganha `upload()` via `XMLHttpRequest`, com o mesmo bearer, `Accept-Language` e tratamento de erro. Input com `accept="image/jpeg,image/png,application/pdf"`; até 10 MB (`TODO(decisão)`). |
| D6 | `/cuenta` para conta `restricted` | Hoje o `PreOpenLayout` manda contas abertas para `/inicio`. A rota `/cuenta` sai do `PreOpenLayout` e ganha um layout próprio: com navegação se a conta já abriu (decisão 14), sem navegação antes. |
| D7 | CTA de `open` | Nova rota `/plan` (placeholder até a T5), para o CTA "Crear plan mensual". |
| D8 | Lista de países e províncias | Constantes de códigos ISO (países da região + "otro"; 24 províncias argentinas), com nomes de país via `Intl.DisplayNames`. `TODO(decisão)`. |
| D9 | `action_required` na linha do tempo | A pendência aparece na etapa "Interactive Brokers abre tu cuenta", como etapa atual com nota; não como erro. |

## Ajustes aprovados em 29/10

- D1 sem `range` (acima); D2 coberto também pelo teste de trocar o país na Revisão para fora da Argentina (vai para a lista de espera, Tarefa 10); D4 com `acceptedAt`; D5 com `accept`; D3, D6–D9 como propostas.
- Antes da Tarefa 1: variação A da Fraunces em `typography.css`; Countdown e CopyField na linguagem de extrato (régua, sem caixa tingida; o último minuto e a expiração mudam só a cor do texto e da régua).
- Execução no modo nativo com TDD; no fim, `/code-review` no diff da fase e correção do que for grave ou médio.

## Review Focus

1. **CUIL válido que não corresponde ao DNI** (dígito verificador certo, outra pessoa): erro no campo CUIL, não envio. (Tarefa 2.)
2. **Recarregar ou abrir por URL uma etapa futura** (`/onboarding/terminos` com `currentStep = address`): redireciona para a etapa atual com os dados salvos preenchidos; o que foi digitado e não salvo é o único dado perdido no recarregamento. (Tarefas 3 e 4.)
3. **Editar uma etapa a partir da Revisão:** salva, volta para a Revisão e `currentStep` continua `review`. (Tarefas 1 e 10.)
4. **Questionário com tipo desconhecido ou `single` sem opções:** a etapa mostra o estado de erro com "Reintentar", sem desenhar uma pergunta quebrada nem cair num fallback fixo. (Tarefa 6.)
5. **Arquivo errado no upload** (HEIC, 25 MB, vazio): mensagem no campo, nenhuma requisição. (Tarefa 12.)

---

## Estrutura de arquivos

```
src/api/
  proposed-types.ts   Questionnaire "range", WaitlistRequest.country: string, OnboardingStepData
  schemas.ts          questionnaireSchema com range
  client.ts           + upload(path, formData, { response, onProgress })
  endpoints.ts        + getTerms; uploadDocument(..., onProgress)
  hooks/account.ts    + useTermsDocuments; useUploadDocument com onProgress
src/mocks/            fixtures (range), handlers (currentStep avança), db (rascunhos por etapa)
src/features/onboarding/
  steps.ts            slugs, resumeStep, canVisit, nextStep, previousStep
  schemas.ts          um schema Zod por etapa + questionnaireAnswersSchema(questionnaire)
  countries.ts        códigos de país e de província
  OnboardingLayout.tsx  carrega rascunho, guarda de etapa, Stepper, rodapé fixo
  WizardFooter.tsx
  useStepForm.ts      defaults do rascunho, memória do não salvo, salvar e avançar
  steps/ResidenceStep.tsx PersonalStep.tsx AddressStep.tsx SuitabilityStep.tsx
        FundsStep.tsx IdentityStep.tsx TermsStep.tsx ReviewStep.tsx
  QuestionField.tsx   single | multi | range
  identity/IdentityVerification.tsx  identity-provider.ts (interface + mock 2 s)
  *.stories.tsx, *.test.ts(x)
src/features/account/
  account-timeline.ts AccountStatusScreen.tsx DocumentUpload.tsx AccountLayout.tsx
  *.stories.tsx, *.test.ts(x)
src/features/session/WaitlistForm.tsx (extraído de NotAvailableScreen)
src/router.tsx, src/routes.ts, src/features/placeholders.tsx
src/i18n/{es,pt,en}.json  namespaces onboarding.*, account.*
e2e/onboarding.spec.ts
docs/api-gaps.md
```

---

### Task 1: Contrato e mock para T2/T3

**Files:**
- Modify: `src/api/proposed-types.ts`, `src/api/schemas.ts`, `src/api/endpoints.ts`, `src/api/hooks/account.ts`, `src/mocks/fixtures.ts`, `src/mocks/handlers.ts`, `src/mocks/db.ts`, `docs/api-gaps.md`
- Test: `src/mocks/handlers.test.ts`, `src/api/schemas.test.ts`, `src/api/hooks/hooks.test.tsx`

**Interfaces:**
- Produces:
  - `Questionnaire["questions"][number]` = `{ id; label; help?: string } & ({ kind: "single" | "multi"; options: { value; label }[] } | { kind: "range"; min: number; max: number; step: number; unit: "usd" })`
  - `WaitlistRequest = { email: string; country: string }` (ISO alfa-2)
  - `getTerms(api)` → `TermsDocument[]` (`response: "terms"`); `useTermsDocuments()`

- [ ] **Step 1: Testes falhando**
  - `handlers.test.ts › PUT /onboarding/personal advances currentStep to "address"`
  - `› PUT /onboarding/residence when currentStep is "review" keeps "review"` (D2)
  - `› questionnaire serves income and netWorth as range with min < max and step > 0`
  - `› POST /waitlist accepts country "UY"`
  - `schemas.test.ts › questionnaireSchema rejects kind "number" and a single without options`
  - `hooks.test.tsx › useTermsDocuments returns the four documents, ibkr_data_consent included`
- [ ] **Step 2:** `npx vitest run src/mocks src/api` → FAIL nos 6.
- [ ] **Step 3: Implementar.** No mock, `income`: `min 0, max 50000, step 500`; `netWorth`: `min 0, max 2000000, step 10000` (só mock). `currentStep = max(currentStep, nextStep(step))` pela ordem de `onboardingSteps`. Atualizar o `api-gaps.md` (item 2: questionário e `currentStep`; item 1: `country` da lista de espera; item 10: aceite dos termos no rascunho, D4).
- [ ] **Step 4:** a mesma execução → PASS; `npm run typecheck`.

### Task 2: Schemas de validação por etapa (TDD)

**Files:**
- Create: `src/features/onboarding/schemas.ts`, `src/features/onboarding/countries.ts`
- Test: `src/features/onboarding/schemas.test.ts`

**Interfaces:**
- Consumes: `isValidCuit`, `normalizeCuit` (`lib/cuit`), `isAtLeastAge` (`lib/age`)
- Produces: `residenceSchema`, `personalSchema`, `addressSchema`, `fundsSchema`, `identitySchema`, `termsSchema(docs: TermsDocument[])`, `questionnaireAnswersSchema(q: Questionnaire)`, e `type XForm = z.infer<...>`. As mensagens de erro são **chaves i18n** (`"onboarding.errors.cuitCheckDigit"`), traduzidas pelo `Field`.

Regras:
- `residence`: `{ country, nationality }`, códigos ISO alfa-2.
- `personal`: `fullName` como no documento (letras com acento, ñ, espaço, apóstrofo e hífen; ao menos duas palavras; 80 caracteres; espaços colapsados); `birthDate` `YYYY-MM-DD` com 18 anos completos e no máximo 120; `dni` 7 ou 8 dígitos (aceita pontos); `cuil` com dígito verificador **e** com o DNI nas posições 3–10 (preenchido com zero à esquerda); `email`; `phone` `+`, dígitos, espaço e hífen, de 8 a 20 dígitos (`TODO(decisão)`).
- `address`: `street` obrigatório, `unit` opcional, `city`, `province` (código da lista), `postalCode` CPA (`C1043AAZ`) ou 4 dígitos.
- `funds`: `occupation` e `sourceOfFunds` de listas de códigos; `isPep: boolean`; `pepRole` obrigatório quando `isPep`.
- `identity`: `{ status: "approved", reference: string }`.
- `termsSchema(docs)`: `accepted` contém um item `{ id, version }` para **cada** documento.
- `questionnaireAnswersSchema(q)`: uma chave por `question.id`; `single` ∈ opções; `multi` com ao menos uma opção, todas válidas; `range` inteiro em `[min, max]`.

- [ ] **Step 1: Testes falhando** (com os valores de `luciaPersonal` como caso válido):
  - `personal › accepts Lucía` · `rejects "Lucía"` (uma palavra) · `rejects "Lucía F3rnández"` · `rejects cuil 27301234560` (dígito) · `rejects cuil 27301234568 with dni 30123457` (DNI diferente) · `accepts dni "30.123.456"` · `rejects birthDate one day before the 18th birthday` (data fixa com `vi.setSystemTime`) · `accepts the 18th birthday itself` · `rejects "not-an-email"`
  - `address › accepts "C1043AAZ" and "1043"` · `rejects "C104"`
  - `funds › requires pepRole only when isPep`
  - `terms › rejects when ibkr_data_consent is missing` · `rejects an old version`
  - `questionnaire › builds keys from the API ids` · `rejects range value above max` · `rejects multi []` · `rejects single value outside the options`
- [ ] **Step 2:** `npx vitest run src/features/onboarding/schemas.test.ts` → FAIL.
- [ ] **Step 3:** implementar os schemas.
- [ ] **Step 4:** → PASS.

### Task 3: Navegação e retomada (TDD)

**Files:**
- Create: `src/features/onboarding/steps.ts`
- Modify: `src/routes.ts`
- Test: `src/features/onboarding/steps.test.ts`

**Interfaces:**
- Produces:
  - `stepSlugs: Record<OnboardingStep, string>` = `residencia, datos, domicilio, perfil, fondos, identidad, terminos, revision`
  - `stepFromSlug(slug: string | undefined): OnboardingStep | null`
  - `resumeStep(draft: OnboardingDraft): OnboardingStep` (= `draft.currentStep`)
  - `canVisit(step, draft): boolean` (índice ≤ índice de `currentStep`)
  - `nextStep(step) / previousStep(step): OnboardingStep | null`
  - `paths.onboardingStep(step): string`, `paths.plan = "/plan"`

- [ ] **Step 1: Testes falhando:** `resumeStep` devolve `address` para o rascunho do cenário `draft`; `canVisit("terms", draft address) === false`; `canVisit("residence", ...) === true`; `stepFromSlug("x") === null`; `nextStep("review") === null`; `previousStep("residence") === null`; os 8 slugs são únicos.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.

### Task 4: Layout do assistente e retomada do rascunho (TDD de integração)

**Files:**
- Create: `src/features/onboarding/OnboardingLayout.tsx`, `WizardFooter.tsx`, `useStepForm.ts`, `draft-memory.ts`
- Modify: `src/router.tsx` (rotas `onboarding` e `onboarding/:slug`), `src/features/placeholders.tsx` (remove `OnboardingScreen`, adiciona `PlanScreen`)
- Test: `src/features/onboarding/resume.test.tsx`

**Interfaces:**
- Consumes: Tarefa 3; `useOnboarding`, `useSaveOnboardingStep`, `useMe`.
- Produces:
  - `<OnboardingLayout />`: `/onboarding` → `Navigate` para a etapa de retomada; slug inválido ou `!canVisit` → idem; status ≠ `draft` → `/cuenta`. Desenha `Stepper` (rótulos `onboarding.steps.<step>`), título da etapa e `<Outlet />`.
  - `<WizardFooter primaryLabel? onBack? pending />`: barra `sticky bottom-0` com fundo creme, régua superior e `pb-[env(safe-area-inset-bottom)]`; "Continuar" (`type="submit"`, `form` = id do formulário da etapa), "Volver" ghost. Desabilitado enquanto `pending`.
  - `useStepForm<S>(step, schema)` → `{ form, onSubmit, isSaving, saveError }`: defaults = memória não salva ?? `draft.steps[step]`; ao enviar faz `PUT` e navega para `nextStep` ou, se `location.state?.returnTo === "review"`, para a Revisão.
  - `draft-memory.ts`: `Map<OnboardingStep, unknown>` em memória do módulo (some no recarregamento e no logout), gravado ao clicar "Volver", para voltar e avançar sem perder o que foi digitado.

- [ ] **Step 1: Testes falhando** (`renderApp` + MSW, cenário `draft`):
  - `opening /onboarding resumes at the address step with the progress "3 de 8"`
  - `going back to personal shows Lucía's saved name`
  - `typed address survives Volver then Continuar`
  - `after saving address, a fresh QueryClient (reload) resumes at suitability`
  - `/onboarding/terminos redirects to the address step`
  - `Continuar is disabled while the PUT is pending` (cenário `slow`)
  - `a submitted account opening /onboarding lands on /cuenta`
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.

### Task 5: Etapas 1 a 3 (país, dados pessoais, endereço)

**Files:**
- Create: `steps/ResidenceStep.tsx`, `steps/PersonalStep.tsx`, `steps/AddressStep.tsx`, `src/features/session/WaitlistForm.tsx`, `steps/steps.stories.tsx`
- Modify: `src/features/session/NotAvailableScreen.tsx` (usa `WaitlistForm`)
- Test: `steps/early-steps.test.tsx`

**Interfaces:**
- Consumes: Tarefas 2 e 4; `config.liveMarkets`; `useJoinWaitlist`.
- Produces: `<WaitlistForm email country />`.

Comportamento:
- Residência: país e nacionalidade em `Select`. Se o país não estiver em `config.liveMarkets` (hoje só AR), "Continuar" vira "Unirme a la lista de espera" e a etapa troca para o `WaitlistForm` com o e-mail de `me`; "Volver" permite corrigir o país.
- A primeira etapa traz a nota de tom: "Tu cuenta se abre en Interactive Brokers, a tu nombre. OpenDollars es tu asesora de inversiones." (`Banner` info).
- Dados pessoais: ajuda do nome "Escribilo como figura en tu DNI"; e-mail preenchido com `me.email`; CUIL formatado com `formatCuit` ao sair do campo.

- [ ] **Step 1:** testes: `country UY shows the waitlist and posts { email, country: "UY" }`; `invalid CUIL shows the translated error and does not PUT`; `NotAvailableScreen still joins the waitlist` (regressão).
- [ ] **Step 2:** FAIL. **Step 3:** implementar com a skill frontend-design (uma pergunta por bloco, `type-title` como pergunta, campos entre réguas). **Step 4:** PASS. Stories: cada etapa vazia, preenchida e com erros.

### Task 6: Etapa 4, perfil de investidor (questionário da API)

**Files:**
- Create: `src/features/onboarding/QuestionField.tsx`, `steps/SuitabilityStep.tsx`, `QuestionField.stories.tsx`
- Test: `steps/suitability.test.tsx`

**Interfaces:**
- Consumes: `useQuestionnaire`, `questionnaireAnswersSchema`.
- Produces: `<QuestionField question control />`: `single` → `RadioCardGroup`; `multi` → `Checkbox` por opção dentro de `fieldset`; `range` → Slider Radix com o valor formatado em USD ao lado (`formatMoney`, tabular) e `aria-valuetext`.

Uma pergunta por bloco: cada pergunta é um `fieldset` com `legend` em `type-heading`, separada por régua. O rascunho guarda `{ questionnaireVersion, answers }`.

- [ ] **Step 1: Testes falhando:**
  - `renders one group per API question, in the API order` (com um questionário de teste diferente do mock, para provar que nada é fixo)
  - `range moves by step with the arrow keys and announces the value`
  - `Continuar with an unanswered multi shows the error on that question`
  - `an unknown kind shows the error state with Reintentar` (Review Focus 4)
  - `saves { questionnaireVersion: "2026-10", answers }`
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.

### Task 7: Etapa 5, origem dos recursos e PEP

**Files:**
- Create: `steps/FundsStep.tsx`
- Test: `steps/funds.test.tsx`

Ocupação e origem em `Select`; PEP em `RadioCardGroup` Sí/No; `pepRole` aparece só no Sí. Cada bloco com uma linha curta de "por qué preguntamos" em `type-caption` (`TODO(compliance)`):
- Origem: "La ley nos pide conocer de dónde viene el dinero que invertís."
- PEP: "Una persona expuesta políticamente ocupa o ocupó un cargo público relevante. Lo preguntamos por la normativa de prevención de lavado de dinero."

- [ ] **Step 1:** testes: `pepRole appears and is required only after Sí`; `each block shows its reason text`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 8: Etapa 6, verificação de identidade

**Files:**
- Create: `identity/identity-provider.ts`, `identity/IdentityVerification.tsx`, `identity/IdentityVerification.stories.tsx`, `steps/IdentityStep.tsx`
- Test: `identity/IdentityVerification.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type IdentityResult =
    | { status: "approved"; reference: string }
    | { status: "failed"; reason: "cancelled" | "error" };
  export interface IdentityProvider {
    // Mounts the vendor flow; returns a cleanup. TODO(decisão): Sumsub, Persona or Onfido.
    start(options: { locale: Locale; onResult: (result: IdentityResult) => void }): () => void;
  }
  export function createMockIdentityProvider(delayMs?: number): IdentityProvider; // 2000
  export const IdentityProviderContext: React.Context<IdentityProvider>;
  ```
  `<IdentityVerification onResult />` com estados `idle` (o que vai precisar: DNI e uma selfie), `running` (texto e `aria-live`), `approved`, `failed` (com "Reintentar"). A cleanup roda no unmount.

- [ ] **Step 1:** testes com `vi.useFakeTimers()`: `approves after 2000 ms, not before`; `unmount during the check calls the cleanup and never calls onResult`; `IdentityStep saves { status: "approved", reference }`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 9: Etapa 7, termos e divulgações

**Files:**
- Create: `steps/TermsStep.tsx`
- Test: `steps/terms.test.tsx`

Um `Checkbox` por documento de `useTermsDocuments()`, na ordem da API, com `description` = link "Leer el documento" para `doc.url` (`TODO(compliance)`: textos em rascunho). O `ibkr_data_consent` traz o texto explícito: "Interactive Brokers está en Estados Unidos. Para abrir tu cuenta a tu nombre, le enviamos tus datos personales y de identidad. Lo hacemos con tu consentimiento, según la Ley 25.326." (`TODO(compliance)`). Nada vem marcado.

- [ ] **Step 1:** testes: `one checkbox per document, none checked`; `Continuar without the IBKR consent shows the error on that checkbox`; `saves { accepted: [{ id, version }] } for the four`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 10: Etapa 8, revisão e envio

**Files:**
- Create: `steps/ReviewStep.tsx`
- Test: `steps/review.test.tsx`

Resumo como extrato: uma seção por etapa, com título `type-heading`, um `Ledger` com os valores (o perfil usa os rótulos do questionário; o CUIL formatado; a identidade como "Verificada"; os termos como "4 documentos aceptados") e um botão ghost "Editar" que navega para a etapa com `state: { returnTo: "review" }`. A ação primária do rodapé é "Enviar solicitud", que chama `useSubmitOnboarding` e navega para `/cuenta`. Um `422` (já enviada) também leva a `/cuenta`.

- [ ] **Step 1:** testes: `shows each section with its saved values`; `Editar on Domicilio, save, returns to review` (Review Focus 3); `Enviar solicitud posts once even on double click and lands on /cuenta with "submitted"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 11: Linha do tempo da conta (TDD)

**Files:**
- Create: `src/features/account/account-timeline.ts`
- Test: `src/features/account/account-timeline.test.ts`

**Interfaces:**
- Produces: `accountTimeline(status: AccountStatus): TimelineStep[] | null` (as etapas `submitted`, `kyc_review`, `ibkr_pending` e `open`; rótulos por chave i18n; `null` para `draft`, `rejected` e `restricted`).

- [ ] **Step 1: Testes falhando:** `submitted → [current, upcoming, upcoming, upcoming]`; `ibkr_pending → [done, done, current, upcoming]`; `action_required → ibkr step current with a note key` (D9); `open → all done`; `draft, rejected and restricted → null`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 12: Upload de documentos com prévia e progresso

**Files:**
- Modify: `src/api/client.ts`, `src/api/endpoints.ts`, `src/api/hooks/account.ts`
- Create: `src/features/account/DocumentUpload.tsx`, `DocumentUpload.stories.tsx`
- Test: `src/api/client.test.ts`, `src/features/account/DocumentUpload.test.tsx`

**Interfaces:**
- Produces:
  - `ApiClient.upload<K>(path, formData, { response: K; onProgress?: (fraction: number) => void })`. `createApiClient({ xhr?: () => XMLHttpRequest })` para teste.
  - `uploadDocument(api, pendingItemId, file, onProgress?)`; a mutação de `useUploadDocument` aceita `onProgress`.
  - `<DocumentUpload item: PendingItem />`: escolher arquivo → validação (JPG/PNG/PDF, até 10 MB, não vazio) → prévia (miniatura via `URL.createObjectURL`, revogada no unmount; PDF mostra nome e tamanho) → "Enviar documento" → barra de progresso (`role="progressbar"`, `aria-valuenow`) → item some da lista quando o `Account` volta.

- [ ] **Step 1:** testes: `upload reports fractions from xhr.upload progress events`; `upload maps a 422 body to ApiError`; `upload sends bearer and Accept-Language`; `rejects a 25 MB file without a request`; `rejects image/heic`; `shows the image preview and revokes it on unmount`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.

### Task 13: Tela de status da conta

**Files:**
- Create: `src/features/account/AccountStatusScreen.tsx`, `AccountLayout.tsx`, `AccountStatusScreen.stories.tsx`
- Modify: `src/router.tsx` (D6, D7), `src/features/placeholders.tsx` (remove `AccountStatusScreen`)
- Test: `src/features/account/AccountStatusScreen.test.tsx`

Estrutura: título por estado (`type-title`), a nota de tom fixa ("Tu cuenta se abre en Interactive Brokers, a tu nombre. OpenDollars es tu asesora."), a `Timeline` quando `accountTimeline` não é `null`, e a ação do estado:
- `draft`: "Continuar solicitud" → etapa de retomada.
- `submitted`, `kyc_review`, `ibkr_pending`: "Costuma levar alguns dias úteis" em voseo ("Suele tardar algunos días hábiles. Te avisamos por correo."). `useAccount` com `refetchInterval` de 60 s nesses estados.
- `action_required`: lista de `DocumentUpload` por `PendingItem` de `kind: "document"`, com título e descrição da API.
- `rejected`, `restricted`: texto neutro, sem motivo, com o contato do suporte (reaproveitar o contato que já existir em `i18n`; se não houver, `TODO(decisão)` com um e-mail placeholder).
- `open`: "Tu cuenta está abierta", a conta mascarada (`ibkrAccountMasked`) em `Ledger`, e um único CTA "Crear plan mensual" → `/plan`. Sem animação.

- [ ] **Step 1:** testes: `it.each` dos 8 estados com o título certo; `no state renders deposit instructions` (nenhum texto que case com `/depósit|transferí|USDC|SWIFT/i` e nenhum link para `/aportar`); `open has exactly one primary action`; `rejected shows no reason and shows support contact`; `restricted keeps the bottom navigation`.
- [ ] **Step 2–4:** FAIL → implementar com a frontend-design → PASS.

### Task 14: Stories, e2e e verificação final

**Files:**
- Create: `e2e/onboarding.spec.ts`
- Modify: stories das tarefas anteriores

- [ ] **Step 1:** stories com os cenários MSW, como em `AppShell.stories.tsx`: cada uma das 8 etapas (vazia, com rascunho, com erro de validação), carregando, erro de rede, lista de espera, verificação em cada estado; T3 com os 8 `AccountStatus`, mais carregando, erro e upload em andamento.
- [ ] **Step 2:** e2e a 375 px: cenário `draft` → retoma em Domicilio → completa até "Enviar solicitud" → `/cuenta` mostra "Enviada"; recarregar no meio (na etapa 5) volta para a etapa 5.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test && npm run build`, `npm run size`, `npm run e2e`, contraste e axe nas stories novas; screenshots a 375 px de cada etapa e de cada estado.
- [ ] **Step 4:** relatório: arquivos por assunto e mensagens de commit sugeridas, sem commitar.

## Execução em 29/10 (modo nativo)

- Tarefas 1–14 concluídas. As etapas 1–3 foram escritas junto com a Tarefa 4 (o layout precisava delas); os testes da Tarefa 5 travaram o comportamento depois.
- Diferenças do plano: a memória do que não foi salvo vive no cache do TanStack Query sob `session` (some no logout), não num `Map` de módulo; os termos guardam o `acceptedAt` como valor do próprio checkbox; o mock lê multipart como texto quando o `formData()` do undici recusa o corpo do XHR do jsdom; stories usam `beforeEach({ msw })` (CSF Next não aceita `parameters.msw`).
- `/code-review` (high) achou 10 pontos; os 8 graves e médios foram corrigidos com teste antes. Ficaram como sugestão: `buttonClass` duplicando a lógica do Button e `formData` sem uso em `request()`.
