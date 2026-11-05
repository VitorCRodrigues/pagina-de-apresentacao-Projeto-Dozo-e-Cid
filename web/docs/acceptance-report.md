# Relatório de aceite (PRD, seção 11)

Fase de acabamento, 04/11/2026. Todos os e2e rodam a 375 px (projeto `mobile-chromium`). Os testes que provam cada critério têm o texto do critério no nome.

## Critérios de aceite principais

| # | Critério | Resultado | Teste que prova | Observação |
|---|---|---|---|---|
| 1 | Nenhuma instrução de depósito aparece enquanto `accountStatus` não for `open` | Passou | `e2e/acceptance.spec.ts` › "Nenhuma instrução de depósito aparece enquanto accountStatus não for open" | Sete status (draft, submitted, kyc_review, ibkr_pending, action_required, restricted, rejected) × `/aportar`, `/aportar/nuevo` e `/aportar/dep-scenario`. |
| 2 | Não é possível confirmar um aporte sem ver a prévia de custos | Passou | `e2e/acceptance.spec.ts` › "Não é possível confirmar um aporte sem ver a prévia de custos" | "Confirmar aporte" não existe nas etapas de valor e trilho; na prévia, a tabela vem antes do botão. |
| 3 | Cotação expirada bloqueia a confirmação e oferece nova cotação | Passou | `e2e/deposit.spec.ts` › "Cotação expirada bloqueia a confirmação e oferece nova cotação" e `e2e/long-session.spec.ts` › "a quote that runs out on the clock gives way to a new one" | O primeiro cobre a recusa do servidor; o segundo, a contagem vencendo no relógio (o caminho do bug do teste manual). |
| 4 | Plano mensal abaixo de `minRecurringUsdCents` é rejeitado com explicação | Passou | `e2e/acceptance.spec.ts` › "Plano mensal abaixo de minRecurringUsdCents é rejeitado com explicação" | O mínimo do texto vem de `GET /config`. |
| 5 | Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e rede errada | Passou | `e2e/deposit.spec.ts` › "Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e rede errada" | Token e rede comparados com `GET /deposits/:id`; o copiar é conferido na área de transferência. |
| 6 | Tela SWIFT mostra a referência obrigatória e o aviso de conta no nome do cliente | Passou | `e2e/acceptance.spec.ts` › "Tela SWIFT mostra a referência obrigatória e o aviso de conta no nome do cliente" | |
| 7 | A linha do tempo esconde `fx_executed` e `wire_sent` para `ar_usdc` | Passou | `e2e/acceptance.spec.ts` › "A linha do tempo esconde fx_executed e wire_sent para ar_usdc" | No SWIFT os dois passos aparecem. |
| 8 | Clique duplo em "Confirmar" não cria dois aportes (mesma `Idempotency-Key`) | Passou | `e2e/acceptance.spec.ts` › "Clique duplo em "Confirmar" não cria dois aportes (mesma Idempotency-Key)" | Todos os `POST /deposits` levam a mesma chave; um único aporte em curso. |
| 9 | Todos os textos existem em ES, PT e EN; nenhum texto fixo no código | Passou | `e2e/acceptance.spec.ts` › "Todos os textos existem em ES, PT e EN; nenhum texto fixo no código" e `src/i18n/copy-rules.test.ts` | O e2e procura chaves cruas e datas cruas (`2026-10`) nas rotas principais nos três idiomas. |
| 10 | Brasil e trilhos `br_*` não aparecem quando `BR` não está em `liveMarkets` | Passou | `e2e/acceptance.spec.ts` › "Brasil e trilhos br_* não aparecem quando BR não está em liveMarkets" | Correção nesta fase: o Brasil aparecia na lista de países de residência (decisão 5). |
| 11 | O app não tem nenhuma tela de saque nem campo para credenciais da IBKR | Passou | `e2e/acceptance.spec.ts` › "O app não tem nenhuma tela de saque nem campo para credenciais da IBKR" | O único caminho para saques é o portal da IBKR, em nova aba; `/retiro`, `/saque` e afins são "página não encontrada". |
| 12 | Cada tela tem estados de carregando, vazio e erro testados | Passou | `e2e/acceptance.spec.ts` › "Cada tela tem estados de carregando, vazio e erro testados" e `src/features/loading-layouts.test.tsx` | No e2e o erro é o do app inteiro (o mock falha todas as rotas de uma vez); o erro de cada tela é provado nos testes de unidade de cada uma. |
| 13 | Todos os cenários de mock (`DepositState`, `AccountStatus`, `BlockReason`) renderizam sem erro | Passou | `e2e/acceptance.spec.ts` › "Todos os cenários de mock (DepositState, AccountStatus, BlockReason) renderizam sem erro" | Um teste por cenário (31): Início, Aportar, detalhe e Status da conta sem `pageerror` nem `console.error`, sempre com h1. |

## Bugs do teste manual

| Bug | Causa | Teste que prova a correção |
|---|---|---|
| "Pausar plano", "Cancelar plano" e "Gerar nova cotação" falhavam com "Algo deu errado do nosso lado" | O service worker do MSW era reiniciado pelo Chrome (por volta de 5 min) e voltava sem as abas que atendia; as requisições iam ao Vite (404 sem JSON, lido como `internal`). O mock agora responde dentro da página, com os mesmos handlers. | `e2e/long-session.spec.ts` (troca de cenário pelo seletor, service workers parados por CDP, cotação vencendo no relógio) e `src/mocks/browser.test.ts` (incluindo o upload multipart com progresso) |
| Português escolhido na T1 voltava ao espanhol ao entrar | Clicar o idioma já ativo não gravava a escolha | `src/components/LanguageSwitcher.test.tsx` e `e2e/i18n.spec.ts` › "Portuguese chosen on the entry screen, already detected from the browser, survives signing in" |
| Erros de mutação caindo no genérico | Verificado: nenhuma tela caía; agora está provado | `src/api/mutation-errors.test.tsx` (9 mutações × 4 códigos; sabotar `errorMessageKey` faz 36 falharem) |
| Cenário `returned` | Já estava correto | `e2e/deposit.spec.ts` › "a returned deposit shows in Aportar, and its detail explains the return" |

## Acessibilidade

- axe (WCAG 2.1 AA) em todas as rotas, nos estados principais, com diálogo aberto: `e2e/a11y.spec.ts`, 12 testes, sem violação.
- axe em todas as 213 stories, contra o Storybook construído: `npm run a11y:stories`, sem violação.
- Teclado sem mouse no onboarding, no aporte e no plano, com o foco visível em cada parada: `e2e/keyboard.spec.ts`.
- Leitor de tela na Timeline: `e2e/a11y.spec.ts` › "the deposit timeline reads in order, with each state and date".
- Corrigido nesta fase: `aria-hidden-focus` do Select do Radix (agora `<select>` nativo); contraste das etapas futuras do Stepper (`gray-500`, 3:1); foco que caía no `<body>` ao fechar diálogos e folhas; páginas inteiras sem h1 (não encontrada, sessão expirada, manutenção, erro ao carregar a sessão); `<li>` solto na folha de envio de documento.

## Performance (Lighthouse, mobile, 375 px)

| Tela | Performance (3G lento) | Acessibilidade | Performance (4G lento) |
|---|---|---|---|
| T1 Entrada | 49 | 100 | 65 |
| T4 Início | 35 | 100 | 47 |
| T9 Carteira | 39 | 100 | 52 |
| T6 Aportar | 37 | 100 | 66 |
| T6 Novo aporte | 38 | 100 | 50 |
| T5 Plano | 38 | 100 | 48 |
| T11 Pendências | 41 | 100 | 53 |
| T12 Perfil | 32 | 100 | 46 |
| T3 Status da conta | 39 | 100 | 53 |

**A meta Performance ≥ 90 não foi atingida.** Acessibilidade 100 em todas. Tabela completa (FCP, LCP, TBT, CLS) em `docs/performance.md`.

- Feito nesta fase: bundle inicial de 177 para 161 kB gzip (o aviso de inatividade e o Dialog saíram da T1); primeira pintura estática no `index.html`; CLS do Início de 0,141 para 0,039 (esqueleto do saldo com as mesmas linhas do cartão).
- Por que não chega a 90: a 400 kbps, os ~235 kB da primeira tela (JS, CSS e fonte) levam mais de 5 s só para baixar, e o app só pinta depois de baixar e executar o JS. As telas com sessão são medidas com o mock dentro do bundle (MSW e fixtures), o que pesa no LCP e não existe em produção.
- O que falta, e é decisão de arquitetura: HTML pré-renderizado da T1 no build; CSS crítico inline (com hash na CSP); fonte carregada depois do primeiro texto; medição das telas com sessão contra a API real.

## Segurança

- CSP restrita no build (`vite.config.ts`), com zero violações em todas as rotas do app construído (`npm run test:csp`, 11/11). Correção nesta fase: o Zod sondava `eval` e gerava violação (agora `jitless`, em `src/lib/zod.ts`).
- Cabeçalhos para a hospedagem (incluindo `frame-ancestors` e HSTS): `docs/hosting-headers.md`.
- Mock fora do build de produção: `scripts/check-build.mjs` roda depois de `npm run build` e falha se houver mock, sessão de medição ou falta de CSP.
- Nenhum token ou dado pessoal em `localStorage`, `sessionStorage`, cookies, URLs ou query strings: `e2e/security.spec.ts`.
- `/security-review`: nenhum achado alto ou médio. O achado baixo (`scripts/serve-static.mjs`) foi corrigido.

## Testes que faltavam

- Upload na T3 no navegador, multipart real, arquivo e foto pela câmera (`capture`): `e2e/account-status.spec.ts`.
- Barra de ação do perfil de investidor no fundo da tela, sem cobrir a última pergunta, a 375 e 320 px: `e2e/profile-help.spec.ts`.
- Login travando sob carga: com 4 workers, a máquina de testes (8 threads, 16 GB) trava por inteiro (um processo ocioso teve o timer de 1 s disparado 8 a 19 s depois). Com 2 workers, o padrão do projeto, foram três inícios a frio seguidos sem falha (42/42). Não é bug do app nem do Vite; o comentário em `playwright.config.ts` registra a medição.
