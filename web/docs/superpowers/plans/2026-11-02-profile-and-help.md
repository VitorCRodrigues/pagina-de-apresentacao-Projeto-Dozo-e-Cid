# Perfil (T12) e Ajuda (T13) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o último placeholder (`/perfil`) pela tela T12, criar a Ajuda (T13) e o refazer do perfil de investidor como telas filhas do Perfil, e criar o `.gitignore` da raiz.

**Architecture:** As regras ficam em funções puras testadas antes das telas: preferências de notificação (`profile/notification-prefs.ts`), termos aceitos por versão (`profile/terms-history.ts`) e respostas salvas do questionário (`profile/suitability-answers.ts`). O Perfil é um índice em seções de extrato, sem ação primária; cada seção carrega e falha sozinha, menos os dados pessoais, sem os quais a tela não existe. Rotas filhas: `/perfil/ayuda` e `/perfil/inversor`.

**Tech Stack:** React 19, React Router, TanStack Query 5, React Hook Form + Zod, i18next, Radix (`Accordion`, já dentro de `radix-ui`), MSW, Vitest, Storybook, Playwright.

**Spec:** `web/docs/prd-frontend.md` (seções 7 T12/T13 e 10), `web/docs/decisions.md` (1, 2, 3, 11, 12, 13, 14, 17), `web/docs/api-gaps.md` (item 1), `web/docs/brand-brief.md`, `web/CLAUDE.md`, `.claude/skills/frontend-design/SKILL.md` (subordinada ao brief).

## Global Constraints

- Nunca tela de saque, nunca campo de credencial da IBKR, nunca chamada direta à IBKR. "Saques e extratos" é só `config.ibkrPortalUrl` em nova aba (`rel="noopener noreferrer"`).
- Dados pessoais só leitura; nada de dado pessoal em URL ou log.
- "Relatórios fiscais" e "Cartão de débito" visíveis e desabilitados, com "Próximamente" (decisões 2 e 3). Nada navegável.
- FAQ sem promessa de rentabilidade, de legalidade no país do cliente, de proteção fiscal ou sucessória; sem "nunca misturamos", sem "minutos" (seção 10, decisões 1, 11, 17). Textos com `TODO(compliance)`.
- Mínimo mensal e dia da janela vêm de `GET /config`, interpolados no FAQ; nenhuma constante nos textos.
- Suporte: `SUPPORT_EMAIL` de `src/lib/support.ts`.
- Textos só em `src/i18n/locales/{es,pt,en}`; voseo; botões no infinitivo. Cores e espaçamentos por token. Fraunces só em títulos aqui: estas telas não têm número de destaque.
- TDD nas Tarefas 1–3. Sem commits; mensagens sugeridas em inglês, Conventional Commits.

## Decisões que este plano toma (para você aprovar)

| # | Ponto em aberto | Decisão proposta |
|---|---|---|
| D1 | Rota do idioma | Proposta nova no api-gaps: `PATCH /me` com `{ locale }`, resposta `Me`. Locale fora de `es/pt/en` → `422`. |
| D2 | Idioma salvo na conta vs. idioma do aparelho | Hoje o app ignora `me.locale`. O seletor do Perfil muda o aparelho na hora e grava na conta; se a gravação falhar, volta ao anterior e avisa. **Ao entrar, o aparelho mantém o idioma dele**: `me.locale` serve ao backend (e-mails, avisos) e `TODO(decisão)` fica para aplicá-lo num aparelho novo. É a opção mais simples, e aplicar no login sobrescreveria quem trocou o idioma na tela de entrada. |
| D3 | Notificações | `Checkbox` existente, não um componente novo de interruptor. Atualização otimista: um `PATCH /me/notifications` só com o campo alterado; falha volta o valor e mostra o erro. Push grava a preferência, sem pedir permissão ao navegador: `TODO(decisão)` PWA ou app nativo, e uma frase "Te avisamos en cuanto esté disponible en tu dispositivo". |
| D4 | Termos aceitos por versão | `GET /account/terms` só traz a versão vigente; quem tem versão nova pendente perderia o registro da anterior. Proposta nova: `TermsDocument.acceptances?: { version, acceptedAt }[]`. O Perfil lista uma linha por documento e versão, a mais recente primeiro, e documentos com versão vigente não aceita aparecem como pendência com link para `/pendientes`. O aceite continua em T11. |
| D5 | "Documentos" | Só existem os documentos de `GET /account/terms`. Os enviados pelo cliente (KYC) não têm rota de listagem: fora desta fase, com `TODO(decisão)`. |
| D6 | Refazer o perfil de investidor | Tela própria `/perfil/inversor`, reaproveitando `QuestionField`, `questionnaireAnswersSchema` e `canRender`. `useStepForm` não serve (depende do contexto do onboarding e do avanço de etapa). Proposta nova: `GET /account/suitability` → `{ questionnaireVersion, answers, completedAt }` e `PUT /account/suitability` com `{ questionnaireVersion, answers }`. Ao salvar: Toast e volta ao Perfil. Texto neutro: "Tu asesor revisa las respuestas" com `TODO(compliance)`: o efeito sobre a carteira não está definido. |
| D7 | Dados pessoais | O que `GET /me` e `GET /account` já dão: nome, e-mail, país, conta IBKR mascarada. Endereço e CUIL ficam de fora (minimização, seção 10). Alterações: `mailto` do suporte. |
| D8 | Conta `restricted` | Perfil inteiro continua acessível (decisão 14). "Refazer" e "Plano" continuam visíveis; o T5 já trata o bloqueio. |
| D9 | Sair | `Dialog` com "Salir" e "Volver". Ao confirmar: `auth.logout()` e remove do cache tudo em `["session"]`, para outra pessoa no aparelho não ver dados; mesmo se `logout` falhar, a sessão local termina. |
| D10 | Acordeão | `Accordion` do Radix, `type="single" collapsible`, em `help/FaqList.tsx`. Componente local à Ajuda (só um uso). Chevron gira com `motion-reduce:transition-none`. |
| D11 | Layout (frontend-design + brief) | Índice em seções de extrato: h2 `type-heading`, conteúdo entre filetes `gray-200`, como Início e Aportar. Sem cartão, sem ícone por item, sem botão primário: nenhuma ação domina um índice. "Salir" é link de texto no fim, sozinho. FAQ: pergunta em `type-label`, resposta em `type-body` com `max-w-prose`. |
| D12 | Rotas e namespaces | `/perfil`, `/perfil/ayuda`, `/perfil/inversor`. Namespace `profile` (T12 e T13); `/perfil/inversor` carrega também `onboarding`. A aba Perfil fica ativa nas filhas (o `NavLink` já casa por prefixo; teste confirma). |
| D13 | `.gitignore` da raiz | `.playwright-mcp/` e `.superpowers/`, as únicas pastas geradas fora de `web/` hoje. `.agents/`, `.claude/` e `skills-lock.json` já estão versionados e ficam. |

## Review Focus

1. **Questionário mudou de versão depois das respostas salvas:** perguntas e opções que não existem mais somem do formulário, sem erro e sem enviar valor velho. (Tarefa 3.)
2. **Dois toques rápidos em notificações, com o primeiro `PATCH` ainda no ar:** cada toque manda só o seu campo, e uma falha volta só ao último valor confirmado. (Tarefa 1 e Tarefa 6.)
3. **Saída com dados em cache:** depois de "Salir", nada de `["session"]` fica na memória. (Tarefa 6.)
4. **Documento com versão nova pendente:** a linha da versão aceita antes continua, e a pendente não aparece como aceita. (Tarefa 2.)
5. **Tradução da FAQ:** nenhuma das três línguas contém termo proibido, nem chave faltando. (Tarefa 7.)

---

## Estrutura de arquivos

```
../.gitignore
src/features/profile/
  notification-prefs.ts (+ test)    prefsPatch
  terms-history.ts (+ test)         acceptedTermsRows, pendingTermsIds
  suitability-answers.ts (+ test)   answersFor
  ProfileScreen.tsx                 T12: seções
  PersonalData.tsx, LanguageSection.tsx, NotificationsSection.tsx, TermsSection.tsx, LogoutAction.tsx
  SuitabilityScreen.tsx             refazer perfil de investidor
  ProfileScreen.test.tsx, SuitabilityScreen.test.tsx, Profile.stories.tsx
src/features/help/
  HelpScreen.tsx, FaqList.tsx, HelpScreen.test.tsx, Help.stories.tsx
src/components/LanguageSwitcher.tsx     + onSelect opcional
src/api/{endpoints,proposed-types,schemas,query-keys,response-types}.ts, hooks/account.ts
src/mocks/{db,handlers,fixtures}.ts + testes, docs/api-gaps.md
src/i18n/locales/{es,pt,en}/profile.json, index.ts, i18next.d.ts, src/router.tsx, src/routes.ts
src/features/placeholders.tsx           removido (último placeholder)
e2e/profile-help.spec.ts
```

---

### Task 1: Preferências de notificação (TDD)

**Files:** Create `src/features/profile/notification-prefs.ts`, `notification-prefs.test.ts`

**Interfaces:** Produces `prefsPatch(current: NotificationPrefs, field: keyof NotificationPrefs, checked: boolean): Partial<NotificationPrefs> | null`.

- [ ] **Step 1: Testes que falham** — `prefsPatch({email:true,push:false},"push",true)` → `{push:true}`; `("email",false)` → `{email:false}`; valor igual ao atual → `null` (não manda `PATCH`); nunca inclui o outro campo.
- [ ] **Step 2:** `npx vitest run src/features/profile/notification-prefs.test.ts` → FAIL. **Step 3:** implementar. **Step 4:** → PASS.

### Task 2: Termos aceitos por versão (TDD)

**Files:** Create `src/features/profile/terms-history.ts`, `terms-history.test.ts`

**Interfaces:** Produces `interface AcceptedTermsRow { id: string; title: string; url: string; version: string; acceptedAt: string }`; `acceptedTermsRows(docs: readonly TermsDocument[]): AcceptedTermsRow[]`; `pendingTerms(docs: readonly TermsDocument[]): TermsDocument[]` (versão vigente sem `acceptedAt`).

- [ ] **Step 1: Testes que falham**
  - Documento aceito sem `acceptances`: uma linha com a versão vigente e `acceptedAt`.
  - Vigente `2026-11` sem `acceptedAt`, `acceptances: [{version:"2026-10",...}]`: a linha é só de `2026-10`, e `pendingTerms` traz o documento.
  - `acceptedAt` vigente também presente em `acceptances`: uma só linha (sem repetir versão).
  - Duas versões do mesmo documento: duas linhas; ordem por `acceptedAt` decrescente, comparando instantes com fusos diferentes; empate mantém a ordem da API.
  - Nunca aceito e sem histórico: nenhuma linha, e está em `pendingTerms`. Lista vazia → `[]`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.

### Task 3: Respostas salvas do questionário (TDD)

**Files:** Create `src/features/profile/suitability-answers.ts`, `suitability-answers.test.ts`

**Interfaces:** Produces `answersFor(questionnaire: Questionnaire, saved: Record<string, unknown> | undefined): QuestionnaireAnswers`.

- [ ] **Step 1: Testes que falham** — pergunta `single` com opção válida mantém; opção que não existe mais → `""`; `multi` filtra só as opções válidas; pergunta nova → `""` ou `[]`; pergunta removida some; `saved` undefined → tudo vazio; valor de tipo errado (`multi` recebendo string) → `[]`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.

### Task 4: Contrato, mock e `.gitignore`

**Files:** `src/api/{proposed-types,schemas,endpoints,query-keys,response-types}.ts`, `src/api/hooks/account.ts`, `src/mocks/{db,handlers,fixtures}.ts`, `src/mocks/handlers.test.ts`, `src/mocks/scenarios.test.ts`, `docs/api-gaps.md`, `../.gitignore`

**Interfaces:** Produces
- `TermsDocument.acceptances?: { version: string; acceptedAt: string }[]`; `SuitabilityRecord { questionnaireVersion: string; answers: Record<string, unknown>; completedAt?: string }`; `SaveSuitabilityRequest { questionnaireVersion: string; answers: Record<string, unknown> }`.
- Hooks: `useNotificationPrefs()`, `useUpdateNotificationPrefs()` (otimista, volta ao valor anterior em erro), `useUpdateLocale()` (`PATCH /me`, atualiza o cache de `me`), `useSuitability()`, `useSaveSuitability()`.

- [ ] **Step 1: Testes do mock que falham** — `PATCH /me {locale:"pt"}` → `200` com `locale:"pt"`; `{locale:"fr"}` → `422`. `GET /account/suitability` → respostas e `completedAt`; `PUT` com versão errada → `422`, certa → `200` com `completedAt` novo. Cenário `terms_update`: `terms-advisory` com `acceptances` da versão `2026-10`; depois do aceite, duas versões. Hook: `PATCH /me/notifications` falho devolve o cache ao valor anterior.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; api-gaps item 1 (`PATCH /me`, suitability) e item 10 (`acceptances`); `.gitignore` da raiz com `.playwright-mcp/` e `.superpowers/` → **Step 4:** PASS; `git check-ignore .playwright-mcp .superpowers` lista as duas.

### Task 5: Textos e rotas

**Files:** `src/i18n/locales/{es,pt,en}/profile.json`, `src/i18n/index.ts`, `src/i18n/i18next.d.ts`, `src/router.tsx`, `src/routes.ts`, `src/features/placeholders.tsx` (remover), `src/router.test.tsx`

**Interfaces:** Produces `paths.help = "/perfil/ayuda"`, `paths.suitability = "/perfil/inversor"`.

- [ ] **Step 1:** Testes: `/perfil`, `/perfil/ayuda` e `/perfil/inversor` renderizam o h1 certo; a aba Perfil fica marcada `aria-current="page"` nas três; paridade de chaves de `profile` (já coberta por `locales.test`).
- [ ] **Step 2:** FAIL → **Step 3:** implementar, com as telas das Tarefas 6–8 → **Step 4:** PASS nas respectivas tarefas.

### Task 6: T12 — Perfil

**Files:** Create em `src/features/profile/`: `ProfileScreen.tsx`, `PersonalData.tsx`, `LanguageSection.tsx`, `NotificationsSection.tsx`, `TermsSection.tsx`, `LogoutAction.tsx`, `ProfileScreen.test.tsx`, `Profile.stories.tsx`. Modify `src/components/LanguageSwitcher.tsx` + teste (`onSelect?: (locale) => void`).

Ordem na tela: Tus datos (ledger + nota + `mailto`), Idioma, Notificaciones, Tu inversión (Plan mensual; Perfil de inversor com a data de `completedAt`), Documentos y términos (linhas: nome, "Versión X", data; pendências com link), Saques y extractos (explicação + link externo), Próximamente (Relatórios fiscais, Cartão de débito), Ayuda, Salir.

- [ ] **Step 1: Testes que falham**
  - Dados: nome, e-mail, país, conta mascarada; nenhum `input`; a nota de suporte com `mailto:` de `SUPPORT_EMAIL`.
  - Idioma: "Português" manda `PATCH /me {locale:"pt"}` e a tela muda; falha volta para ES e mostra erro.
  - Notificações: marcar push manda só `{push:true}`; falha desmarca e mostra erro; dois toques seguidos, em e-mail e push, com o primeiro `PATCH` no ar, mandam cada um só o seu campo.
  - Links: `/plan`, `/perfil/inversor`, `/perfil/ayuda`; extratos com `href` de `config.ibkrPortalUrl`, `target="_blank"`, `rel` com `noopener`, texto citando conta no nome do cliente.
  - Sem saque nem credencial: nenhum campo de senha ou usuário; nenhuma rota de saque.
  - Termos: `terms_update` mostra a versão `2026-10` com data e uma pendência com link `/pendientes`; a versão nova não aparece como aceita.
  - "Próximamente": os dois itens visíveis, sem `link` nem `button`, com `aria-disabled`.
  - Sair: abre `Dialog`; "Volver" não sai; "Salir" encerra, leva a `/` e `queryClient` não guarda nada em `["session"]`.
  - Erro em `GET /me`: `ErrorState` com retry. Erro em uma seção (`/me/notifications`): `InlineError` só nela, resto na tela. Carregando: `LoadingState`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; stories `Full`, `TermsPending`, `Restricted`, `LogoutDialog`, `SectionError`, `Loading`, `LoadError` → **Step 4:** PASS.

### Task 7: T13 — Ajuda

**Files:** Create `src/features/help/HelpScreen.tsx`, `FaqList.tsx`, `HelpScreen.test.tsx`, `Help.stories.tsx`

Perguntas, nesta ordem: quem guarda meu dinheiro; quanto custa; por que há mínimo mensal (`{{min}}` de config); por que o investimento acontece uma vez por mês (`{{day}}` de config); quanto demora a abertura ("alguns dias úteis"); o que fazer se enviei pela rede errada (escrever ao suporte na hora; sem promessa de recuperação); como saco meu dinheiro (portal IBKR, conta bancária no meu nome). Depois: seção de suporte com o endereço como texto selecionável e `mailto`.

- [ ] **Step 1: Testes que falham**
  - As 7 perguntas como botões, fechadas; abrir uma fecha a anterior (`aria-expanded`).
  - Valores vêm de config: com `minRecurringUsdCents` e `investmentWindowDay` alterados, a resposta muda.
  - Guarda de compliance, percorrendo `es`, `pt` e `en` de `profile.json`: nenhuma resposta casa `/rentabilidad garantizada|sin riesgo|sem risco|no risk|herencia|herança|inheritance|sucesi|sucess|es legal|é legal|minutos|minutes|nunca mezclamos|nunca misturamos/i`.
  - Quem guarda cita Interactive Brokers e o nome do cliente; abertura cita "días hábiles".
  - Suporte mostra `SUPPORT_EMAIL`. Config com erro: `ErrorState`; carregando: `LoadingState`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; `TODO(compliance)` no componente e nas chaves; stories `Closed`, `OneOpen`, `Loading`, `LoadError` → **Step 4:** PASS.

### Task 8: Refazer o perfil de investidor

**Files:** Create `src/features/profile/SuitabilityScreen.tsx`, `SuitabilityScreen.test.tsx`; stories em `Profile.stories.tsx`. Se necessário, exportar `canRender`.

- [ ] **Step 1: Testes que falham** — traz as respostas salvas marcadas; sem responder tudo, mostra os erros do schema e não salva; salvar manda `PUT /account/suitability` com `{ questionnaireVersion, answers }`, mostra Toast e volta a `/perfil`, onde a data muda; questionário com opção removida carrega sem ela; erro ao salvar mostra `Banner` e fica na tela; pergunta de tipo desconhecido (`canRender` falso) → `ErrorState`. Carregando e erro.
- [ ] **Step 2:** FAIL → **Step 3:** implementar com `useForm` + `zodResolver(questionnaireAnswersSchema)` + `QuestionField` + `ActionBar`, com `pb-24` na tela inteira; stories `SuitabilityForm`, `SuitabilityValidation`, `SuitabilityLoading`, `SuitabilityError` → **Step 4:** PASS.

### Task 9: Verificação, design e revisão

**Files:** Create `e2e/profile-help.spec.ts`.

- [ ] E2E a 375 px: trocar idioma no Perfil e ver a navegação mudar; abrir uma pergunta da Ajuda; refazer o perfil e voltar; sair e cair na entrada. `RiskNote`, se houver `ActionBar`, fora da barra. Sem scroll horizontal. Link de extratos numa linha em ES, PT e EN.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run size && npx playwright test`.
- [ ] Capturas a 375 px de cada estado; revisão de design contra o brief; corrigir grave e médio.
- [ ] `/code-review` no diff da fase; corrigir grave e médio; repetir a verificação.
- [ ] Relatório com arquivos por grupo e mensagens Conventional Commits em inglês.
