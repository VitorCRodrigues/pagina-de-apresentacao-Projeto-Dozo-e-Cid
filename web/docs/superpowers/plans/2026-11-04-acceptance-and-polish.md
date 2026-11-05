# Acabamento: bugs, critérios de aceite, acessibilidade, performance e segurança — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os bugs do teste manual, provar cada critério da seção 11 do PRD com um e2e a 375 px e fechar a etapa 7 (acessibilidade, performance, segurança, ajustes de design acumulados).

**Architecture:** O mock deixa de depender do service worker: os handlers MSW passam a responder dentro da página (interceptores de `fetch` e `XMLHttpRequest`), o que elimina a causa dos bugs e permite um build de medição com mock para o Lighthouse. Os critérios de aceite viram e2e nomeados com o texto do PRD; os que já existem são renomeados, não duplicados. O resto são correções pequenas e localizadas, cada uma com teste.

**Tech Stack:** React 19, React Router, TanStack Query 5, MSW 3 (`getResponse`) + `@mswjs/interceptors`, Playwright + `@axe-core/playwright`, Lighthouse (Node API) + `puppeteer-core`, Vitest, Storybook 10.

**Spec:** `web/docs/prd-frontend.md` (seções 5, 7, 9, 10 e 11), `web/docs/decisions.md`, `web/docs/brand-brief.md`, `web/CLAUDE.md`, `.claude/skills/frontend-design/SKILL.md` (subordinada ao brief e às decisões).

## Global Constraints

- Nunca commit nem push. No fim: arquivos por grupo, mensagens em inglês, Conventional Commits.
- Textos só em `src/i18n/locales/{es,pt,en}`; voseo; botões no infinitivo. Texto novo → `npm run copy:review`.
- Cores e espaçamentos só por token. Uma família (Inter). Dourado só no rótulo "Total".
- Sem token nem dado pessoal em armazenamento persistente, URL, query string ou log.
- Mock (MSW, handlers, cenários) nunca no build de produção.
- e2e a 375 px. Investigar causas; nunca "corrigir" com timeout maior ou retry.
- TDD: o teste que reproduz cada bug ou critério roda e falha antes da correção (critério já coberto: o teste existente passa e é renomeado).

## O que achei antes de planejar (reproduzido, não suposto)

Reproduzi com Playwright como você testou: PT, emulação de celular, a mesma aba, troca de cenário pelo seletor, navegação entre telas e a cotação vencendo de verdade (5 min).

1. **Causa dos dois bugs: o service worker do MSW para de interceptar.** A cotação saiu às 14:55:32 (`POST /deposits/quote → 200`). Ao vencer, "Gerar nova cotação" mandou o mesmo `POST` e recebeu **404 do servidor do Vite**, não do mock. Por volta de 5 minutos o Chrome encerra e reinicia o service worker. Ele volta com a lista de abas ativas (`activeClientIds`) vazia e deixa todas as requisições passarem para o servidor. O 404 vem sem JSON, `toApiError` o lê como `internal` e a tela mostra "Algo deu errado do nosso lado. Tente de novo." Pausar e cancelar o plano falham do mesmo jeito depois de alguns minutos na aba. O plano continua "Ativo" porque o TanStack Query mostra o dado antigo do cache.
   - **Descartado** (verificado no código e na reprodução): estado do banco por cenário (cada troca recarrega e recria o banco), cache do TanStack após a troca (a recarga zera), `Idempotency-Key` reaproveitada (pausa e cotação não usam), corpo rejeitado pelo handler (o mesmo corpo dá 200 antes dos 5 min) e código sem tradução (todos os códigos do mock estão em `apiErrorCodes` e nos três idiomas).
   - **Por que os e2e não pegaram:** cada teste abre um contexto novo e dura menos de um minuto, então o service worker nunca chega a ser reiniciado. O e2e de cotação usa o cenário `quote_expired`, em que o servidor recusa na confirmação; nenhum espera o relógio vencer a cotação.
2. **Bug extra, ligado ao "app em PT":** com o navegador em português, a T1 já abre em PT. Clicar em "Português" clica a opção ativa; o Radix manda `""` e o seletor ignora sem gravar a escolha. Depois de entrar, `me.locale` (es) vence e o app volta ao espanhol. Reproduzido: `od.locale.choice` fica `null` e o h1 vira "Tu cuenta".

## Decisões que este plano toma (para você aprovar)

| # | Ponto | Decisão proposta |
|---|---|---|
| D1 | Correção do mock | Trocar o `setupWorker` por interceptação na própria página: `BatchInterceptor` (`FetchInterceptor` + `XMLHttpRequestInterceptor`, para o upload com progresso) e `getResponse(handlers, request)` do MSW. Sem service worker, não há nada para o Chrome encerrar. O plugin `msw/vite` sai do app e fica só no build do Storybook, que é sessão curta e usa o addon. Na primeira carga, o app remove o registro antigo do `mockServiceWorker.js` que o navegador ainda tiver. `@mswjs/interceptors` (já instalado como dependência do msw) entra como devDependency explícita, na mesma versão. |
| D2 | Escolha de idioma na T1 | Clicar o idioma ativo também grava a escolha explícita. A precedência que você definiu continua: escolha do aparelho > `me.locale` > navegador. Só deixa de se perder um clique. |
| D3 | Erros de mutação | `errorMessageKey` continua. Novo teste: para cada mutação (pausar, retomar, editar, cancelar plano, cotação, confirmar aporte, aceitar termos, salvar perfil de investidor, idioma, notificações, upload), um código conhecido devolvido pelo servidor mostra o texto do código, nunca `errors.internal`. Resposta sem JSON continua `internal`, que é o correto para uma resposta que não é da API. |
| D4 | `aria-hidden-focus` do Select | O `Select` do Radix põe `aria-hidden` no resto da página com elementos focáveis dentro, e o axe acusa. Troco por `<select>` nativo estilizado nos 4 usos (endereço, origem dos recursos, residência, dia do plano). No celular, a roda nativa é melhor que um popover, e o problema some sem regra desligada. |
| D5 | Etapas futuras do Stepper | Hoje `gray-200` sobre creme, abaixo de 3:1 para objeto gráfico (WCAG 1.4.11). Passa a `gray-500` em `h-0.5`: contraste de 3:1, e continua mais leve que a etapa atual (marinho, `h-1.5`) e as feitas (verde, `h-1`). |
| D6 | Lighthouse | `lighthouse` e `puppeteer-core` como devDependencies, usando o Chromium do Playwright. Build de medição `vite build --mode measure`: produção minificada com o mock em página e sessão mock iniciada no boot, porque o token só vive em memória e o Lighthouse precisa abrir cada rota direto. Um teste garante que o build de produção não tem nada disso. Rotas: `/`, `/inicio`, `/cartera`, `/aportar`, `/aportar/nuevo`, `/plan`, `/pendientes`, `/perfil`, `/cuenta` (cenário `action_required`). 3G lento: RTT 400 ms, 400 kbps, CPU 4x. Meta: Performance ≥ 90, Accessibility 100. Se alguma rota não chegar a 90 depois das correções, o relatório mostra o número e o que falta; não mexo na medição para passar. |
| D7 | CSP | `<meta http-equiv="Content-Security-Policy">` injetado só no build: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`. `frame-ancestors` só vale como cabeçalho HTTP: fica documentado em `docs/security.md` para quem configurar a hospedagem, com `TODO(decisão)` para o SDK de KYC e o analytics. Um e2e no build de preview confirma zero violações de CSP nas rotas. |
| D8 | Foto da câmera na T3 | Hoje só existe o seletor de arquivo. Entra um segundo botão, "Sacar una foto", com `<input type="file" accept="image/jpeg,image/png" capture="environment">`. Ele aparece só em aparelho com tela de toque (`pointer: coarse`); no desktop vira o mesmo seletor. |
| D9 | Ações destrutivas e de saída | Nova variante `Button` `quiet`: contorno `gray-500` de 1 px, sem preenchimento, raio de controle, altura de 44 px. Texto `brick-700` para destrutiva ("Cancelar plan") e `navy-900` com ícone `LogOut` para saída ("Cerrar sesión"). Os links verdes ficam só para navegação. |
| D10 | Por que cada trilho | Nova chave `rail.why.<rail>` (es/pt/en), uma linha sob o nome, no T5 e no T6, com `TODO(compliance)`. Rascunho: `ar_usdc` "Si ya usás una exchange: suele llegar en el día y con el menor costo."; `ar_swift` "Desde tu banco, sin pasar por una exchange."; `br_*` equivalentes. "USDC desde una exchange" em uma linha a 375 px: o valor e a porcentagem descem para uma segunda linha, em vez de apertar o nome. |
| D11 | Barra da carteira só com trânsito | O segmento "em trânsito" passa a ter contorno tracejado `gray-500` e a trilha não tem fundo. Assim uma barra inteira em trânsito não se confunde com trilha vazia. Sem padrão listrado, que esbarraria em "sem gradientes". |
| D12 | Esqueletos | Um esqueleto por tela (Início, Carteira, Aportar, Detalhe do aporte, Plano, Pendências, Perfil), com os mesmos blocos e alturas da tela carregada, montado com o `Skeleton` existente. O `RouteFallback` genérico fica só para as rotas sem esqueleto próprio. |
| D13 | Sheet no desktop | A partir de `lg`, vira diálogo centrado (`max-w-[440px]`, raio de cartão), sem a alça. No celular continua folha inferior. |
| D14 | "Completá este dato" | Em pergunta de opção, a mensagem vira "Elegí una opción." (nova chave `onboarding.errors.choose`, es/pt/en). Campo de texto mantém a atual. |
| D15 | Perfil `restricted` e Ajuda | O Perfil restrito mostra o mesmo aviso de Início e Plano, reaproveitando o componente, no topo. A Ajuda ganha "Volver al perfil" no topo, como o perfil de investidor. |

## Review Focus

1. Sessão longa na mesma aba (mais de 5 minutos) com mutação no fim: precisa responder pelo mock, não pelo Vite.
2. Troca de cenário seguida de uma ação: o banco do novo cenário é o que responde.
3. Rede lenta durante a renovação da cotação: o botão fica em carregamento e não permite dois pedidos.
4. Conta `restricted` em toda tela com ação: explicação, nunca erro genérico.
5. 320 px e textos longos em PT e EN nas telas mudadas: nada corta nem gera rolagem horizontal.

Cada item tem teste na tarefa dona: 1 e 2 na Tarefa 1, 3 na Tarefa 1 (passo 2), 4 na Tarefa 2, 5 na Tarefa 10.

---

### Tarefa 1: Mock dentro da página (corrige pausar, cancelar e renovar a cotação)

**Files:**
- Modify: `src/mocks/browser.ts`, `src/main.tsx`, `vite.config.ts`, `package.json`
- Test: `e2e/long-session.spec.ts` (novo), `src/mocks/browser.test.ts` (novo)

**Interfaces:**
- Produces: `startMocking(): Promise<() => void>` em `src/mocks/browser.ts` (instala os interceptores; devolve a função que os remove). `main.tsx` chama no lugar de `worker.start`.

- [ ] **Passo 1: e2e que falha, nomeado pelo caminho do seu teste manual.** `e2e/long-session.spec.ts`. Cada teste troca de cenário pelo seletor (empty → returned → open) e entra de novo. Depois para todos os service workers por CDP (`ServiceWorker.enable` e `ServiceWorker.stopAllWorkers`), o que equivale ao Chrome encerrar o worker:
  - "pausar e cancelar o plano funcionam depois que o navegador reinicia o service worker": o status vira Pausado; cancelar pelo diálogo mostra "Cancelaste tu plan"; nenhum `alert` com "Algo salió mal".
  - "a cotação que vence no relógio gera uma nova": `page.clock.install()` antes da prévia e `fastForward("05:01")`. Espera "La cotización venció"; "Generar nueva cotización" leva a um "Confirmar aporte" habilitado com contagem nova; nenhum alerta genérico. Rede lenta via `page.route` com atraso de 2 s: o botão fica em carregamento e um segundo clique não dispara outro `POST /deposits/quote` (contar os pedidos).
- [ ] **Passo 2:** rodar. Esperado: os dois falham no estado atual (404 do Vite, alerta genérico).
- [ ] **Passo 3: teste de unidade** `browser.test.ts`: com `startMocking()` ativo, um `fetch("/api/v1/health")` responde `{ status: "ok" }` e um `XMLHttpRequest` multipart para `/api/v1/account/documents` chega ao handler. Depois de chamar a função devolvida, `fetch` volta a ser o original.
- [ ] **Passo 4: implementar D1.** `startMocking` cria um `BatchInterceptor` com os dois interceptores; no evento `request`, `getResponse(handlers, request)` e `controller.respondWith(response)` quando há resposta. Requisição sem handler passa adiante, como hoje. Em `main.tsx`, antes de iniciar: `navigator.serviceWorker?.getRegistrations()` e `unregister()` dos que têm `mockServiceWorker.js`. Em `vite.config.ts`, remover o plugin `msw` do app (o Storybook mantém o dele).
- [ ] **Passo 5:** rodar o Passo 1 e a suíte e2e inteira. Esperado: verde.

### Tarefa 2: Erros de mutação com texto do código

**Files:**
- Test: `src/api/mutation-errors.test.tsx` (novo)
- Modify: as telas que o teste acusar.

- [ ] **Passo 1:** uma tabela de casos (mutação, tela, rota MSW, código) roda a tela com `renderApp` e um handler que devolve o código, e espera o texto de `errors.<code>`, nunca o de `errors.internal`. Códigos: `account_restricted`, `compliance_hold`, `market_not_live`, `validation_failed`, `below_minimum`, `not_found`, `rate_limited`, `maintenance`, `idempotency_conflict`, mais `quote_expired` onde se aplica. Um caso a mais: resposta sem JSON continua genérica. Também a T4/T5/T12 `restricted` sem ação devolvendo erro: a explicação aparece.
- [ ] **Passo 2:** rodar; corrigir cada tela que cair no genérico (uso de `error` sem `errorMessageKey`, banner próprio com texto fixo). `maintenance` e `rate_limited` seguem o tratamento global, se já existir; senão o texto do código.
- [ ] **Passo 3:** suíte verde.

### Tarefa 3: Idioma escolhido na T1 sobrevive ao entrar

**Files:** Modify `src/components/LanguageSwitcher.tsx`; Test `src/components/LanguageSwitcher.test.tsx`, `e2e/i18n.spec.ts`.

- [ ] **Passo 1:** testes: clicar o idioma já ativo grava `od.locale.choice`; e2e com navegador `pt-BR` → clicar "Português" → entrar → h1 "Sua conta".
- [ ] **Passo 2:** rodar, ver falhar. **Passo 3:** com valor `""`, gravar `i18n.resolvedLanguage` como escolha explícita (D2). **Passo 4:** verde.

### Tarefa 4: Cenário `returned` de ponta a ponta

**Files:** Test `e2e/deposit.spec.ts` (novo teste); Modify o que falhar.

- [ ] **Passo 1:** e2e "o aporte devolvido aparece em Aportar e o detalhe explica a devolução". Em Aportar, a linha "Devuelto" de `dep-scenario`. O detalhe tem a Timeline com o passo `returned` (ler pelo snapshot de acessibilidade), o motivo vindo da API, o texto `deposit.detail.refund` e o link de suporte com `mailto:`.
- [ ] **Passo 2:** rodar; corrigir o que faltar; verde.

### Tarefa 5: Critérios de aceite da seção 11, um e2e cada a 375 px

**Files:** Create `e2e/acceptance.spec.ts`; Modify os specs que já cobrem (só o nome do teste muda).

Nome de cada teste = texto do critério, em português, igual ao PRD. Mapa (reaproveitar = renomear o existente e mover para um `test.describe("Critérios de aceite (PRD 11)")` no próprio arquivo):

| Critério | Teste |
|---|---|
| Nenhuma instrução de depósito aparece enquanto `accountStatus` não for `open` | novo: para cada status ≠ open, `/aportar/nuevo` e o detalhe de um aporte mostram o bloqueio, nunca endereço ou referência |
| Não é possível confirmar um aporte sem ver a prévia de custos | novo: "Confirmar aporte" só existe com a tabela de custos visível; fora dela, nenhum botão de confirmação no DOM |
| Cotação expirada bloqueia a confirmação e oferece nova cotação | renomear `deposit.spec` "a quote the server calls expired…" e juntar o caso do relógio da Tarefa 1 |
| Plano mensal abaixo de `minRecurringUsdCents` é rejeitado com explicação | novo: 200 → mensagem do mínimo com o valor de `/config`, sem avançar |
| Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e rede errada | renomear `deposit.spec` "a USDC deposit from the amount…" e acrescentar as asserções do aviso e do copiar (clipboard via `context.grantPermissions`) |
| Tela SWIFT mostra a referência obrigatória e o aviso de conta no nome do cliente | novo: escolher SWIFT, confirmar, ver referência e aviso |
| A linha do tempo esconde `fx_executed` e `wire_sent` para `ar_usdc` | novo: detalhe USDC, snapshot de acessibilidade da Timeline sem esses passos; o de SWIFT tem |
| Clique duplo em "Confirmar" não cria dois aportes (mesma `Idempotency-Key`) | novo: `dblclick`; contar os `POST /deposits` e conferir a mesma chave; um único aporte na lista |
| Todos os textos existem em ES, PT e EN; nenhum texto fixo no código | novo e2e que percorre as rotas principais nos três idiomas e não acha chave crua (`/\b[a-z]+\.[a-zA-Z.]+\b/` fora de URLs). Os testes de unidade de `copy-rules` continuam como prova da paridade |
| Brasil e trilhos `br_*` não aparecem quando `BR` não está em `liveMarkets` | novo: onboarding (país) e trilhos do T6 e do T5 sem Brasil nem Pix |
| O app não tem nenhuma tela de saque nem campo para credenciais da IBKR | novo: percorre todas as rotas; nenhum `input[type=password]`, nenhum texto de saque/retiro fora do link externo do portal |
| Cada tela tem estados de carregando, vazio e erro testados | novo: cenários `slow`, `empty` e `server_error` em cada rota principal mostram esqueleto, vazio e erro |
| Todos os cenários de mock (`DepositState`, `AccountStatus`, `BlockReason`) renderizam sem erro | novo: itera `scenarioIds`, entra, visita Início, Aportar e o detalhe, sem `pageerror` nem `console.error` |

- [ ] **Passo 1:** escrever os testes novos; rodar. Esperado: os que pegarem falha real são corrigidos na própria tarefa (anotar a correção no relatório).
- [ ] **Passo 2:** renomear os existentes; suíte e2e verde.

### Tarefa 6: Acessibilidade

**Files:** Create `e2e/a11y.spec.ts`, `e2e/a11y-stories.spec.ts`, `e2e/keyboard.spec.ts`; Modify `src/components/Select.tsx` (nativo, D4) e os 4 usos, `src/components/Stepper.tsx` (D5), `src/components/Timeline.tsx` se o snapshot pedir.

- [ ] **Passo 1:** axe (`wcag2a`, `wcag2aa`, `wcag21aa`) em todas as rotas, nos estados principais e com o Select aberto e um diálogo aberto. Stories: `storybook build` e depois um teste que lê `index.json` e roda o axe em cada `iframe.html?id=…`. Esperado antes: falha em `aria-hidden-focus` (Select) e no contraste do Stepper, mais o que aparecer.
- [ ] **Passo 2:** teclado sem mouse: onboarding completo, aporte do valor às instruções, plano criar → pausar → cancelar. Só `Tab`, `Shift+Tab`, `Enter`, `Space` e setas. Foco sempre visível (contorno calculado não vazio) e nenhuma armadilha.
- [ ] **Passo 3:** leitor de tela na Timeline: `toMatchAriaSnapshot` no detalhe (lista ordenada, cada passo com estado e data em texto, `aria-current` no passo atual).
- [ ] **Passo 4:** implementar D4 e D5 e o que o axe apontar. Sem desligar regra, exceto com justificativa escrita no teste e no relatório.
- [ ] **Passo 5:** verde.

### Tarefa 7: Performance

**Files:** Create `scripts/lighthouse.mjs`, `docs/performance.md`; Modify `vite.config.ts` (modo `measure`), `package.json` (`perf`), e o que estourar.

- [ ] **Passo 1:** D6. `npm run perf` builda em `measure`, sobe o `vite preview`, roda o Lighthouse mobile em 3G lento em cada rota e grava a tabela em `docs/performance.md`.
- [ ] **Passo 2:** medir. Correções previstas, só se o número pedir: `preload` da fonte; separar do bundle inicial o que a T1 não usa (o shell autenticado, `radix-ui` de diálogo e toast); carregar os namespaces de i18n por rota antes de renderizar, sem bloquear o primeiro paint.
- [ ] **Passo 3:** `size-limit` verde; tabela final no relatório.

### Tarefa 8: Segurança

**Files:** Modify `vite.config.ts` (plugin CSP só no build), Create `docs/security.md`, `e2e/production.spec.ts` (contra `vite preview`), `src/security.test.ts`.

- [ ] **Passo 1:** testes: o `dist/index.html` tem a CSP do D7; nenhum arquivo de `dist/` contém `msw`, `mockServiceWorker`, `scenario` ou `fixtures`; em `vite preview`, as rotas carregam sem violação de CSP (`securitypolicyviolation` registrado na página). Unidade: depois de entrar e navegar, `localStorage` e `sessionStorage` só têm chaves permitidas (`od.locale.choice`; `od.mock.scenario` só em dev) e nenhum valor parecido com token. Toda URL visitada nos e2e passa por um verificador que não aceita e-mail, CUIT/CUIL, nome ou token na query.
- [ ] **Passo 2:** rodar a skill `/security-review`; corrigir o que for alto ou médio; o resto vai para `docs/security.md`.
- [ ] **Passo 3:** verde.

### Tarefa 9: Testes que faltam

**Files:** `e2e/account-status.spec.ts` (novo), `e2e/profile-help.spec.ts`, `src/features/account/DocumentUpload.tsx` (D8), `e2e/*` (login).

- [ ] **Passo 1:** upload na T3, cenário `action_required`: `setInputFiles` com um PDF e com uma foto JPEG pelo input de câmera; o `POST /account/documents` sai como `multipart/form-data` com `pendingItemId` e `file` (lido no handler pela rota real do navegador); a pendência some. Tipo errado e arquivo grande são recusados antes do envio.
- [ ] **Passo 2:** perfil de investidor: a barra de ação fica colada ao fundo da viewport, o último campo rola acima dela (sem sobreposição) a 375 e a 320 px, como o teste do onboarding.
- [ ] **Passo 3:** estabilidade do login. Rodar `--repeat-each=10 --workers=4` com trace, achar onde trava (suspeitas: o primeiro clique em "Entrar" antes de o mock estar pronto, ou o Vite servindo deps na primeira carga paralela) e corrigir a causa. Depois 10×4 sem falha. A Tarefa 1 pode já ter removido parte da causa; o teste prova.

### Tarefa 10: Ajustes de design acumulados (frontend-design, subordinada ao brief)

**Files:** os componentes de cada item; testes de componente e e2e onde dito.

- [ ] D9 ações destrutivas e de saída: teste de componente da variante `quiet` e e2e a 375 px, nenhum link verde para "Cancelar plan" ou "Cerrar sesión".
- [ ] D15 Perfil `restricted` e voltar da Ajuda: testes de tela.
- [ ] D10 trilhos: textos novos e "USDC desde una exchange" em uma linha a 375 px (e2e mede a altura da linha do nome nos três idiomas).
- [ ] Datas: localizar e trocar todo mês ou data crus (`2026-10`) por `Intl.DateTimeFormat` do locale (teste que procura `/\d{4}-\d{2}/` no texto das telas). Hífen em valor negativo: o sinal sai do bloco `tabular-nums` (ou vira `U+2212` pelo `Intl`) para não abrir espaço; teste do `Money` com `-500`.
- [ ] D12 esqueletos por tela, com stories; o e2e de "carregando" da Tarefa 5 confere o esqueleto certo.
- [ ] D13 Sheet no desktop: story e e2e a 1280 px (centrada, sem alça).
- [ ] D11 barra só em trânsito: teste do `BalanceSplit` e captura.
- [ ] Toque e respiro: "Qué es este fondo" com alvo ≥ 44 px e vão entre itens; o recuo de 4 px do "Reintentar" alinhado à margem do texto; o vão entre h1 e filete nos estados vazio e erro igual ao das telas carregadas (`PageState`).
- [ ] D14 mensagem de escolha nas perguntas de opção.
- [ ] Revisão a 320 px em PT e EN das telas mudadas, sem corte nem rolagem horizontal (Review Focus 5).

### Tarefa 11: Fechamento

- [ ] `docs/acceptance-report.md`: uma linha por critério da seção 11 (passou/falhou, teste que prova, observação), mais as tabelas de axe, Lighthouse e `size-limit`.
- [ ] `npm run copy:review` se algum texto mudou; os testes de `legal-docs` verdes.
- [ ] typecheck, lint, testes, build, size, e2e.
- [ ] Capturas a 375 px, antes e depois, das telas mudadas, incluindo a etapa 4 do onboarding e as telas que mudaram com a Inter e o logo. Revisão de design final contra o brief; corrigir o grave e o médio.
- [ ] Skill `/code-review` no diff da fase inteira; corrigir o grave e o médio, cada correção com teste.
- [ ] Lista de arquivos por grupo, mensagens em inglês, Conventional Commits.
