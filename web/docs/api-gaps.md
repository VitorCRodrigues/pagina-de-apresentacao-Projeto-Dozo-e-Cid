# Lacunas do contrato de API (seção 8 do PRD)

Itens que o front precisa para implementar as telas e que o contrato proposto não cobre. Cada item traz o problema, a proposta do front e o status. Até a confirmação, o mock (MSW) segue a proposta do front e o código marca o ponto com `TODO(decisão)`.

Convenções que valem para todas as propostas: base `/api/v1`, JSON, dinheiro em centavos inteiros de USD, datas ISO 8601 UTC e `Idempotency-Key` em toda criação.

## 1. Endpoints que faltam

| Necessidade | Tela | Proposta do front | Status |
|---|---|---|---|
| Lista de espera para país fora de `liveMarkets` | T1, T2 | `POST /waitlist` com `{ email, country }`, com sessão. `country` é qualquer código ISO 3166-1 alfa-2 (não só `Country`), porque a etapa 1 do onboarding oferece países fora do piloto; código fora do formato → `422`. E-mail inválido → `422 validation_failed` com `fields.email`. Resposta `204`. | A confirmar com o Dozo |
| Botão "Ya envié" (só avisa o suporte; não muda o estado) | T7, T11 | `POST /deposits/{id}/sent-notice`. Resposta `204`. Idempotente por depósito. | A confirmar com o Dozo |
| Preferências de notificação (e-mail e push) | T12 | `GET /me/notifications` e `PATCH /me/notifications` com `{ email: boolean, push: boolean }`. | A confirmar com o Dozo |
| Aceite de termos novos | T11, T12 | `GET /account/terms` (versões vigentes e aceitas) e `POST /account/terms/{id}/accept`. | A confirmar com o Dozo |
| Formato de `GET /notifications` | T11 | Reusar `PendingItem[]`, ordenado por `dueAt`, mais `createdAt` e `readAt?`. | A confirmar com o Dozo |
| Encerrar sessão | T12 | Depende do provedor OIDC. Proposta: `POST /auth/logout`, que invalida o refresh token e limpa o cookie. | A confirmar com o Dozo |

## 2. Corpos de requisição e resposta não definidos

| Endpoint | Problema | Proposta do front | Status |
|---|---|---|---|
| `GET /onboarding` | O formato do rascunho não está definido. | `{ currentStep: OnboardingStep, steps: Partial<Record<OnboardingStep, unknown>> }`, com `OnboardingStep = "residence" \| "personal" \| "address" \| "suitability" \| "funds" \| "identity" \| "terms" \| "review"`. `currentStep` é a primeira etapa ainda não salva: cada `PUT` a avança para a etapa seguinte à salva e nunca a faz voltar (editar uma etapa a partir da revisão mantém `review`). O front retoma o assistente em `currentStep`. | A confirmar com o Dozo |
| `PUT /onboarding/{step}` | Os nomes de `step` e o corpo de cada etapa não estão definidos. | Usar os nomes acima; corpo validado por um schema Zod por etapa (`src/features/onboarding/schemas.ts`), compartilhável com o backend. Erros de campo em `error.fields: Record<string, code>`. Etapa `terms`: `{ accepted: { id, version, acceptedAt }[] }`, um item por documento de `GET /account/terms`, com `acceptedAt` em ISO 8601 UTC do momento em que o cliente marcou a caixa; o backend registra o aceite no `POST /onboarding/submit`. | A confirmar com o Dozo |
| `GET /onboarding/questionnaire` | Não há schema das perguntas. | `{ version, questions: { id, kind: "single" \| "multi", label, options: { value, label }[] }[] }`, já traduzido pelo `Accept-Language`. Faixas (renda, patrimônio) são perguntas `single` com opções fechadas; não há campo numérico livre. `options` tem ao menos um item. | A confirmar com o Dozo |
| `POST /deposits/quote` | O corpo da requisição não está definido. | `{ amountCents: number, planId?: string }`. O país vem do cliente autenticado. Resposta: `Quote`. | A confirmar com o Dozo |
| `POST /deposits` | Não está claro se a resposta já traz as instruções. | Corpo `{ quoteId, rail }`. Resposta: `Deposit` com `instructions` preenchido, para o front ir direto ao T7. | A confirmar com o Dozo |
| `POST /plans` | O corpo não está definido. | `{ amountCents, dayOfMonth, rail }`, com `dayOfMonth` de 1 a 28 e `rail` obrigatório (decisão 16). Resposta: `Plan`. | A confirmar com o Dozo |
| `PATCH /plans/{id}` | Não está claro como pausar, retomar e cancelar. | Mesmo endpoint com `{ status }` ou campos parciais. Cancelar é `status: "cancelled"`. | A confirmar com o Dozo |
| `GET /deposits` | Paginação e filtro por estado (T10) não definidos. | `?state=...&cursor=...&limit=20`. Resposta `{ items: Deposit[], nextCursor?: string }`. | A confirmar com o Dozo |

## 3. Catálogo de `error.code`

**Problema:** o contrato só cita `quote_expired`. O front traduz erros pelo `code` (decisão 12), então precisa da lista fechada.

**Proposta do front:**

| `code` | HTTP | Quando |
|---|---|---|
| `validation_failed` | 422 | Corpo inválido; detalhes em `error.fields` |
| `quote_expired` | 409 | Cotação vencida no `POST /deposits` |
| `below_minimum` | 422 | Valor abaixo de `minDepositUsdCents` ou `minRecurringUsdCents` |
| `account_not_open` | 409 | Aporte com conta fora de `open` |
| `account_restricted` | 409 | Conta `restricted` (decisão 14) |
| `compliance_hold` | 409 | Bloqueio de compliance; sem detalhe ao cliente |
| `market_not_live` | 403 | País fora de `liveMarkets` |
| `idempotency_conflict` | 409 | Mesma `Idempotency-Key` com corpo diferente |
| `not_found` | 404 | Recurso inexistente ou de outro cliente |
| `session_expired` | 401 | Ver item 4 |
| `maintenance` | 503 | Ver item 4 |
| `rate_limited` | 429 | Muitas tentativas |
| `internal` | 500 | Erro inesperado |

**Status:** a confirmar com o Dozo.

## 4. Sessão expirada e manutenção

**Problema:** todas as telas têm os estados "sessão expirada" e "manutenção", mas o contrato não diz como a API sinaliza cada um.

**Proposta do front:**
- Sessão: `401` com `error.code = "session_expired"`. O front tenta um refresh silencioso uma vez; se falhar, mostra SessionExpired. Inatividade de 15 minutos é controlada no front, com aviso antes.
- Manutenção: `503` com `error.code = "maintenance"` e `error.until` (ISO 8601) quando houver previsão, além do header `Retry-After`. O front mostra Maintenance com o horário.

**Status:** a confirmar com o Dozo.

## 5. Cotação usada no detalhe do aporte (T8)

**Problema:** o T8 pede "cotação usada", mas `Deposit` não tem `quoteId`, taxa de câmbio nem validade. No `ar_usdc` não há câmbio.

**Proposta do front:** acrescentar a `Deposit` o campo `quote?: { id: string; rateDescription?: string; createdAt: string }`. Se o trilho não tem câmbio, o front omite a linha.

**Status:** a confirmar com o Dozo.

## 6. Primeiro depósito

**Problema:** o T7 recomenda um envio de teste pequeno no primeiro depósito, mas nada na API indica se é o primeiro.

**Proposta do front:** campo `isFirstDeposit: boolean` em `Deposit` (ou `firstDepositAt?: string` em `Account`), calculado no backend. Deduzir pela lista no front é frágil por causa da paginação e dos depósitos devolvidos.

**Status:** a confirmar com o Dozo.

## 7. Endereço USDC e referência SWIFT: por conta ou por aporte

**Problema:** não está definido se o endereço de depósito USDC é fixo por conta ou gerado por aporte, nem se a referência SWIFT muda a cada aporte. Isso muda o cache do front, o QR code e o texto ("use sempre este endereço" ou "use este endereço só para este aporte").

**Proposta do front:** as instruções vêm sempre dentro de `Deposit.instructions`, e o front não reaproveita instruções entre aportes. Acrescentar `scope: "account" | "deposit"` em `DepositInstructionsUsdc` e `DepositInstructionsWire`, para escolher o texto certo.

**Status:** a confirmar com o Dozo.

## 8. Outros pontos do contrato

| Ponto | Problema | Proposta do front | Status |
|---|---|---|---|
| Nomes dos mínimos | T5 e T6 citam `config.minRecurringUsd` e `config.minDepositUsd`; os tipos usam `minRecurringUsdCents` e `minDepositUsdCents`. | O front usa os nomes dos tipos (`...Cents`). | A confirmar com o Dozo |
| Escopo de `BlockReason` | `blockReasons` está em `Account`, mas `quote_expired` e `pix_med_hold` são de um aporte. | `Account.blockReasons` só com motivos de conta; `Deposit.blockReason?` para motivos do aporte; `quote_expired` vem como `error.code`. | A confirmar com o Dozo |
| `kyc_passed` e `ibkr_open` em `history[]` | Não está claro se o backend inclui esses estados no primeiro aporte. | O backend não inclui; o front acrescenta os passos de conta só como contexto no primeiro aporte. | A confirmar com o Dozo |
| `ar_usdc` passando por `fx_executed` e `wire_sent` | Pendência conhecida do backend. | O front já esconde esses estados no `ar_usdc` e não depende deles. | A confirmar com o Dozo |
| `Portfolio.totalCents` | A fórmula não está no contrato. | Investido + caixa + trânsito, sem custos (decisão 15). | A confirmar com o Dozo |
| `costPreview` e `mayCollect` | Não se sabe como serão expostos. | Dentro de `POST /deposits/quote`: `costPreview` vira `RailOption.costs`; `mayCollect` falso vira `error.code` ou `Account.blockReasons`. | A confirmar com o Dozo |
| Idioma dos textos | O contrato não diz como a API escolhe o idioma. | `Accept-Language: es \| pt \| en` em toda chamada; conteúdo editorial traduzido pela API (decisão 12). | A confirmar com o Dozo |

## 9. Definições usadas pelo mock enquanto o contrato não fecha

| Ponto | Valor no mock | Status |
|---|---|---|
| `GET /config` sem sessão | Responde sem `Authorization`; o resto das rotas responde `401 session_expired` sem token. | A confirmar com o Dozo |
| `minDepositUsdCents` | `10000` (US$ 100); o PRD diz "a confirmar". | A confirmar com o Dozo |
| País antes do login | A T1 não conhece o país; a checagem de `liveMarkets` acontece depois de `GET /me`. | A confirmar com o Dozo |

## 10. Definições do mock completo (28/10)

Detalhes que o mock (`src/mocks/handlers.ts`) precisou fixar para servir o contrato inteiro. Todos seguem o padrão de erro `{ error: { code, message, fields? } }`, com `fields` no formato `{ campo: "invalid" }`.

| Ponto | Comportamento no mock | Status |
|---|---|---|
| Formato de `GET /account/terms` | `TermsDocument[]`: `{ id, kind, version, title, url, acceptedAt? }`, com `kind` em `advisory_agreement`, `cost_disclosure`, `privacy_policy` ou `ibkr_data_consent`. Aceite: `POST /account/terms/{id}/accept` → `204`. | A confirmar com o Dozo |
| `POST /account/documents` | Multipart com `pendingItemId` e `file`; responde a `Account` sem a pendência enviada. | A confirmar com o Dozo |
| `POST /onboarding/submit` | Só a partir de `draft`; responde a `Account` com `status: "submitted"`. Fora de `draft` → `422`. | A confirmar com o Dozo |
| Idempotência | `POST /deposits` e `POST /plans`: sem `Idempotency-Key` → `422 validation_failed`; mesma chave e mesmo corpo → a resposta original com `200`; mesma chave e corpo diferente → `409 idempotency_conflict`. A primeira criação responde `201`. | A confirmar com o Dozo |
| Bloqueios de aporte e plano | País fora de `liveMarkets` → `403 market_not_live`; conta `restricted` → `409 account_restricted`; conta não aberta → `409 account_not_open`. | A confirmar com o Dozo |
| Cotação | Válida por 300 s; `recommended` no trilho mais barato (`ar_usdc`); `expectedDays` de 0–1 (USDC) e 1–3 (SWIFT). `POST /deposits` com cotação vencida → `409 quote_expired`; cotação desconhecida → `404 not_found`. | A confirmar com o Dozo |
| `GET /deposits` | `?state=`, `?limit=` (padrão 20) e `?cursor=` opaco; `nextCursor` só quando há mais itens. | A confirmar com o Dozo |
| `PATCH /me/notifications` | Corpo parcial (`{ push: true }`); responde as preferências completas. | A confirmar com o Dozo |
| Dados fictícios | USDC na rede "Ethereum (ERC-20)"; tarifa SWIFT estimada em US$ 35; ETFs UCITS reais (IE00B5BMR087, IE00BK5BQT80, IE00B4L5Y983) com quantidades inventadas. Nada disso é decisão de produto. | Só mock |
