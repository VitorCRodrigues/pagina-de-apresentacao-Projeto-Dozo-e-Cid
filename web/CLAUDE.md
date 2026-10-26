# OpenDollars — App do cliente (web/)

## Fontes da verdade

- Funcional, estados, API, compliance: docs/prd-frontend.md (vence em qualquer conflito)
- Visual e tom: docs/brand-brief.md
- Conflitos já resolvidos: docs/decisions.md
- Contexto de negócio: docs/business-context.md (nunca usar como fonte de texto ao cliente)

## Produto em uma frase

Conta de investimento em USD, de longo prazo, com aportes mensais. O cliente não opera.
OpenDollars é consultora (RIA); a Interactive Brokers é corretora e custodiante; o dinheiro fica no nome do cliente.
Piloto: Argentina, espanhol, ~50 contas, celular.

## Regras inegociáveis

- Nomes de estados, trilhos e campos exatamente como em src/api/types.ts (seção 8 do PRD). Sem sinônimos.
- Mínimos, IOF, teto, dia da janela e trilhos vêm de GET /config. Nunca constantes no front.
- Dinheiro em centavos inteiros (number). Formatar só na apresentação, com Intl.NumberFormat. Nunca float para somar dinheiro.
- Nenhuma instrução de depósito enquanto accountStatus !== "open".
- Nenhum aporte confirmado sem a prévia de custos visível. Cotação expirada bloqueia o botão.
- Uma Idempotency-Key por intenção de aporte; o botão desabilita após o clique.
- ar_usdc: esconder fx_executed e wire_sent; partner_collected aparece como "USDC recebido".
- Nunca tela de saque, nunca campo de credencial da IBKR, nunca chamada direta à IBKR.
- Sem tokens em localStorage. Sem dados pessoais em URL, logs ou analytics.
- Brasil e trilhos br_* só aparecem se "BR" estiver em config.liveMarkets.
- Nenhum texto fixo em componente: tudo em src/i18n/{es,pt,en}.json. ES é o padrão.
- Texto ao cliente segue a seção 10 do PRD. Na dúvida: texto neutro + TODO(compliance).
- Algo indefinido: opção mais simples + comentário TODO(decisão) + seguir em frente.

## Design

- Estética "private banking digital": fundo creme, marinho, muito respiro. Um foco e uma ação primária por tela.
- Cores e espaçamentos só por tokens (src/styles/tokens.css + tailwind.config). Nunca hex solto em componente.
- Fraunces em títulos e valores de destaque; Inter na UI; tabular-nums em todo valor monetário.
- Proibido: gradientes, neon, emoji, ícones de moeda/foguete, linguagem de hype ou de cripto, gráfico de rentabilidade diária.
- Mobile-first (referência 375 px), WCAG 2.1 AA, respeitar prefers-reduced-motion.
- Reutilize componentes de src/components antes de criar novos.

## Stack

React + Vite + TypeScript strict, React Router, TanStack Query, React Hook Form + Zod, Tailwind + Radix UI,
i18next, MSW, Vitest + Testing Library, Playwright, Storybook.

## Definição de pronto

- npm run typecheck && npm run lint && npm test && npm run build passam.
- Toda tela tem story para cada estado (carregando, vazio, erro e os estados de negócio) e teste.
- Commits pequenos, Conventional Commits em inglês.
- Não mexer em App/ (backend) nem na landing page da branch main.
