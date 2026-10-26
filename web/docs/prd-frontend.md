# OpenDollars — PRD do Front-end (App do Cliente)

Oct 23, 2026 · @Ramiro Rodrigues

> Conversão em Markdown do PDF original ("OpenDollars — PRD do Front-end (App do Cliente)", 23 páginas). Conteúdo transcrito sem resumo; só a formatação foi adaptada.

## 1. Como usar este documento

Este documento é o contexto completo para construir o front-end do app do cliente OpenDollars. Ele foi escrito para ser colado em um assistente de IA ou entregue a um desenvolvedor sem nenhuma outra explicação.

Instruções para a IA que receber este documento:

1. Você vai construir o front-end do app do cliente (web, mobile-first) descrito na seção 7, seguindo as regras das seções 5, 6 e 10.
2. O backend ainda não tem servidor HTTP. Construa tudo contra uma API simulada (mock) que siga exatamente o contrato da seção 8. Quando o backend existir, só a camada de API deve mudar.
3. Use exatamente os nomes de estados, trilhos e campos deste documento (por exemplo `deposit_notified`, `ar_usdc`). Eles vêm do código do backend (`App/funding.ts`, `App/portfolio.ts`, `App/config.ts`). Não invente sinônimos.
4. Nunca coloque regras de negócio só no front. O front valida para dar feedback rápido, mas o backend é a fonte da verdade. Valores como IOF, mínimo de aporte e teto vêm da API, não de constantes no código do front.
5. Nunca peça, guarde ou mostre credenciais da Interactive Brokers no app. Login, saques e extratos da IBKR acontecem no portal da própria IBKR.
6. Os textos voltados ao cliente seguem a seção 10 (compliance). Na dúvida, use linguagem neutra e marque o texto com `TODO(compliance)`.
7. Quando algo não estiver definido aqui, escolha a opção mais simples, deixe registrado em um comentário `TODO(decisão)` e siga em frente. As decisões em aberto estão na seção 12.
8. Entregue em etapas, na ordem da seção 11, com testes e Storybook (ou equivalente) para cada tela.

Fontes deste documento: `OpenDollars-Money-Architecture-Plan.md`, `OpenDollars-Architecture-Stress-Test.md` e o resumo do código da branch `Arquitetura` (pasta `App/`), todos de outubro de 2026. O contrato de API da seção 8 é uma proposta do front e precisa ser confirmado com o Dozo (backend).

## 2. Contexto do produto

OpenDollars é uma conta de investimento em dólar com aportes mensais para pessoas da Argentina e do Brasil que querem guardar dinheiro em USD por décadas.

Como funciona, do ponto de vista do cliente:

- O cliente abre uma conta na Interactive Brokers (IBKR), nos EUA, no próprio nome. O app do OpenDollars conduz esse cadastro.
- O OpenDollars é um consultor de investimentos registrado nos EUA (RIA). Ele escolhe a carteira e envia as ordens, mas nunca recebe nem guarda o dinheiro do cliente.
- O dinheiro entra por um parceiro licenciado em cada país e vai direto para a conta IBKR do cliente.
- A carteira é de ETFs domiciliados na Irlanda (UCITS), de acumulação, em USD. Eles replicam índices americanos, como o S&P 500, sem expor o cliente ao imposto de herança americano.

Usuários do piloto:

| Perfil | Descrição |
|---|---|
| País | Argentina (piloto). Brasil vem depois e está desligado no código |
| Idioma | Espanhol (principal no piloto), português e inglês |
| Dispositivo | Principalmente celular |
| Quem são | Cerca de 50 contas de amigos e família no piloto fechado |
| Situação típica | Já tem dólar em banco argentino (MEP) ou USDC em exchange local (Ripio, Lemon, Belo, Bitso) |

Promessas publicadas no site (o produto precisa honrá-las): conta em dólar recorrente; conta no nome do cliente; dinheiro passa por parceiro licenciado; câmbio simples; consultoria de equipe registrada nos EUA; relatórios fiscais do país de origem; proteção sucessória. Cartão de débito em USD está fora do piloto ("em breve").

Princípios de produto para o front:

- **Transparência de custos antes de qualquer aporte.** O cliente sempre vê o custo total antes de confirmar.
- **Status sempre visível.** O dinheiro passa por várias etapas e parceiros; o cliente precisa saber onde está cada aporte.
- **Simplicidade.** O cliente não escolhe ETFs nem faz trades. Ele define quanto aporta por mês; o resto é automático.
- **Confiança.** Nada de linguagem de "ganhe rápido", nem promessas que o jurídico ainda não aprovou (seção 10).

## 3. Arquitetura do sistema e estado do backend

O backend hoje é uma biblioteca TypeScript com testes, sem servidor HTTP. O front deve ser construído contra um mock até que os endpoints existam.

Quem faz o quê:

| Peça | Responsável | Papel |
|---|---|---|
| Corretora e custódia | Interactive Brokers (IBKR) | Guarda os ativos, executa ordens, faz câmbio entre moedas fortes. É a fonte da verdade dos saldos |
| Consultor | OpenDollars | Onboarding, carteira, ordens agregadas, status, compliance, relatórios |
| Câmbio local (Brasil) | Instituição autorizada pelo Banco Central | Recebe Pix em BRL, compra USD e envia para a IBKR |
| USDC (Argentina) | Zerohash, via IBKR | Converte USDC em USD dentro da conta IBKR (taxa de 0,30%, mínimo US$1) |

Fluxo do dinheiro: banco ou carteira do cliente → parceiro licenciado → conta IBKR do cliente. O OpenDollars só envia instruções e recebe avisos de status.

Camadas do sistema (alvo):

```
App do cliente (web/mobile, PT/ES/EN) <- este documento
        | HTTPS, OAuth2/OIDC
API do OpenDollars (ainda não existe)
        |
Núcleo (App/, TypeScript, Node 23+, Postgres)
  funding.ts   regras de aporte: roteamento, máquina de estados, bloqueios
  portfolio.ts janela mensal, 1 ordem por ETF, checagens pré-trade
  ledger.ts    partidas dobradas em centavos de USD
  recon.ts     reconciliação diária com o extrato Flex da IBKR
  db.ts        persistência + outbox
  ibkr.ts      único módulo com credenciais da IBKR
        |
IBKR / parceiros de câmbio / Zerohash
```

Módulos do backend e o que o front aproveita:

| Módulo | O que faz | Relevância para o front |
|---|---|---|
| `config.ts` | IOF 1,1%, teto eFX US$10k, mínimo US$250, `liveMarkets: ["AR"]` | Valores a exibir; o front busca via API, não copia |
| `funding.ts` | `route()` escolhe o trilho; `advance()` move o estado do aporte; bloqueios | Nomes de estados e trilhos, mensagens de bloqueio |
| `portfolio.ts` | Uma ordem por ISIN por mês; ETF substituto; só ações inteiras | Explica por que o investimento acontece em data fixa no mês |
| `ledger.ts` | Saldos por "balde": `client_bank` → `in_flight` → `ibkr_cash` → `invested`, mais `fees:*` | Base para mostrar dinheiro em trânsito, em caixa e investido |
| `costPreview` | Calcula a prévia de custos | Tela de confirmação do aporte (ainda não ligada a nada) |
| `mayCollect` | Diz se o aporte pode ser coletado | Habilitar ou bloquear o botão de aporte |

O que ainda não existe no backend (o front não pode depender disso funcionando agora):

- Servidor HTTP, endpoints, webhooks e autenticação.
- Agendamento de aportes recorrentes e das rotinas (outbox, janela mensal, importação diária).
- Integração real de KYC: hoje KYC é só um campo alterado por `setKyc`.
- Aviso de depósito real à IBKR: depende de acesso à Account Management API.
- Nenhum aporte real completa hoje; o fluxo para em `deposit_notified`.
- Adaptador do parceiro brasileiro, relatórios fiscais e cartão.

Consequência para o front: construa todas as telas com dados simulados, incluindo os estados de erro e espera. Isso é trabalho útil desde já, porque o contrato (seção 8) é o que o backend vai precisar expor.

## 4. Escopo do front-end

O escopo é o app do cliente para o piloto na Argentina, com o Brasil preparado mas desligado por feature flag.

Dentro do escopo (piloto):

- Login e sessão (provedor ainda não escolhido; usar placeholder OIDC)
- Onboarding: dados pessoais, perfil de investidor (suitability), envio de documentos, termos
- Acompanhamento da abertura da conta IBKR, incluindo "aguardando aprovação" e "documentos pendentes"
- Plano de aporte mensal (valor, dia, trilho), com mínimo de US$250
- Aporte avulso
- Prévia de custos obrigatória antes de confirmar qualquer aporte
- Instruções de depósito USDC (rede e token travados) e SWIFT
- Linha do tempo de status de cada aporte
- Carteira: valor total, posições por ETF, dinheiro em trânsito e em caixa
- Histórico de aportes
- Central de pendências (documentos, avisos, aportes travados)
- Perfil e configurações (idioma, notificações)
- Link para o portal da IBKR (saques e extratos oficiais)
- Ajuda e FAQ com textos aprovados

Fora do escopo agora:

| Item | Motivo |
|---|---|
| Saque dentro do app | No piloto, saque acontece no portal da IBKR, com 2FA da IBKR (Stress Test 3.8 e 6.3) |
| Extratos oficiais | Também no portal da IBKR |
| Fluxo Pix do Brasil em produção | Brasil desligado (`liveMarkets: ["AR"]`) até resolver a falha B1 e o parceiro de câmbio. Construir a tela atrás de feature flag é opcional |
| Escolher ETFs ou fazer trades | O cliente não opera; a carteira é definida pelo consultor |
| Cartão de débito | Fase 3 |
| Saldo em stablecoin | Fora de escopo; USDC é só meio de entrada |
| Relatórios fiscais | Backend ainda não tem; deixar espaço na navegação como "em breve" |
| Painel interno de operações | É outro produto (backoffice). Este documento cobre só o app do cliente |
| Landing page pública | Já existe na branch `main`; não mexer |

## 5. Regras de negócio que o front precisa respeitar

Todas estas regras são aplicadas no backend. O front as reflete na interface para orientar o cliente, e sempre lê os valores da API (`GET /config`).

Aportes:

| Regra | Valor | Comportamento no front |
|---|---|---|
| Aporte recorrente mínimo | US$250 por mês | Bloquear valores menores e explicar o motivo (custos fixos) |
| Frequência do recorrente | Mensal | Não oferecer semanal |
| Investimento | Uma janela de execução por mês | Mostrar a data prevista de investimento; o dinheiro pode ficar em caixa até lá |
| Conta IBKR aprovada | Obrigatória antes de qualquer aporte | Nenhuma instrução de depósito aparece antes de `ibkr_open` (falha B2) |
| Não fatiar aportes | Uma instrução nunca é dividida | Não oferecer "dividir em partes" |
| Prévia de custos | Obrigatória | Botão de confirmar só depois de exibir a prévia |
| Validade da cotação de câmbio | Cotação expira | Mostrar contagem regressiva; se expirar, pedir nova cotação |

Trilhos de entrada (`Rail`):

| Trilho | País | Como o cliente paga | Status |
|---|---|---|---|
| `ar_usdc` | Argentina | Envia USDC para o endereço de depósito da IBKR/Zerohash | Padrão no piloto (mais barato: 0,30%, mín. US$1) |
| `ar_swift` | Argentina | Transferência SWIFT em USD da própria conta bancária | Alternativa; tarifas fixas altas em valores pequenos |
| `br_efx` | Brasil | Pix para parceiro eFX, até US$10k por operação | Desligado no piloto |
| `br_fxbank` | Brasil | Banco de câmbio, acima de US$10k (somando aportes do mesmo dia) | Desligado no piloto |

Regras do USDC (críticas para não perder dinheiro do cliente):

- Só aceitar USDC (a IBKR também aceita RLUSD e PYUSD, mas o produto usa USDC).
- Nunca USDT. Se o cliente tem USDT, instruir a converter para USDC na exchange antes.
- Mostrar o endereço com a rede e o token travados e destacados. Rede errada pode significar perda de fundos.
- No primeiro depósito, sugerir um envio de teste de valor pequeno.
- Oferecer botão de copiar e QR code. Nunca deixar o cliente digitar o endereço.

Bloqueios que impedem aporte (o front mostra a mensagem e o que fazer):

| Bloqueio | Mensagem ao cliente (sentido) | Ação sugerida |
|---|---|---|
| Conta IBKR ainda não aberta | Sua conta está em análise pela Interactive Brokers | Acompanhar pendências |
| Conta IBKR restrita ou fechada | Sua conta precisa de atenção | Falar com o suporte |
| Sanção ou revisão de compliance | Não é possível fazer aportes no momento | Falar com o suporte (não revelar o motivo) |
| Cotação expirada | A cotação expirou | Gerar nova cotação |
| Retenção antifraude (Pix MED, Brasil) | Seu aporte está em período de segurança | Aguardar; mostrar data prevista |
| País não liberado | Ainda não disponível no seu país | Entrar na lista de espera |

Saldos: o backend registra o dinheiro em baldes. O front deve mostrar separadamente: em trânsito (`in_flight`), em caixa na IBKR (`ibkr_cash`), investido (`invested`) e custos pagos (`fees:*`). Valores em USD com duas casas decimais; o backend trabalha em centavos inteiros.

## 6. Máquina de estados do aporte e mapeamento para a UI

Cada aporte segue uma sequência fixa de estados definida em `funding.ts` (`advance()`). O front mostra essa sequência como uma linha do tempo com textos amigáveis, nunca os nomes técnicos.

```
kyc_passed -> ibkr_open -> deposit_notified -> partner_collected -> fx_executed
           -> wire_sent -> broker_credited -> invested

Qualquer etapa após deposit_notified pode ir para: returned
```

| Estado (`DepositState`) | Texto ao cliente (ES / PT) | O que o cliente faz | Visível no trilho |
|---|---|---|---|
| `kyc_passed` | Identidad verificada / Identidade verificada | Nada | Todos |
| `ibkr_open` | Cuenta en EE. UU. abierta / Conta nos EUA aberta | Nada | Todos |
| `deposit_notified` | Esperando tu depósito / Aguardando seu depósito | Enviar o dinheiro seguindo as instruções | Todos |
| `partner_collected` | Recibimos tu dinero / Recebemos seu dinheiro | Nada | Todos (no USDC, mostrar como "USDC recebido") |
| `fx_executed` | Cambio realizado / Câmbio realizado | Nada | Só `ar_swift`, `br_*` |
| `wire_sent` | Transferencia enviada / Transferência enviada | Nada | Só `ar_swift`, `br_*` |
| `broker_credited` | Dinero en tu cuenta / Dinheiro na sua conta | Nada; mostrar data da próxima janela de investimento | Todos |
| `invested` | Invertido / Investido | Nada | Todos |
| `returned` | Depósito devuelto / Depósito devolvido | Ver motivo e falar com o suporte | Todos |

Regras de exibição:

- **USDC:** hoje o backend obriga o trilho `ar_usdc` a passar por `partner_collected`, `fx_executed` e `wire_sent`, o que não faz sentido para USDC (é uma pendência conhecida do backend). No front, para `ar_usdc`, esconda `fx_executed` e `wire_sent` e trate `partner_collected` como "USDC recebido". Não dependa da existência desses estados.
- `kyc_passed` e `ibkr_open` são etapas da conta, não do aporte. Mostre-as no onboarding e na linha do tempo do primeiro aporte só como contexto.
- `deposit_notified` é o único estado em que o cliente precisa agir. Destaque-o com as instruções de depósito e um botão "Ya envié" / "Já enviei" (que só informa o suporte; não muda o estado).
- `broker_credited` → `invested` pode levar até um mês, porque o investimento acontece numa janela mensal. Mostre a data prevista da próxima janela para o cliente não achar que algo travou.
- `returned` sempre vem com um motivo (`returnReason`) e um texto sobre reembolso. A política de reembolso depende do contrato com o parceiro; use `TODO(compliance)`.
- Cada estado tem data e hora (`history[]`). Mostre o horário local do cliente.
- Se um aporte ficar parado no mesmo estado por mais tempo que o esperado (`expectedBy` vencido), mostre um aviso suave e um link para o suporte.

## 7. Telas e fluxos

O app tem dois momentos: onboarding (até a conta IBKR abrir) e uso (aportes e carteira). A navegação muda conforme `account.status`.

Navegação principal (após conta aberta): Início · Aportar · Carteira · Pendências · Perfil.

Antes da conta abrir, só existem o fluxo de onboarding e a tela de status da conta.

### T1. Entrada e login

- Escolha de idioma (ES padrão para Argentina; detectar pelo navegador).
- Login e cadastro via provedor OIDC (placeholder; botão "Entrar" que chama `auth.login()`).
- Se o país do cliente não estiver em `config.liveMarkets`, mostrar "Ainda não disponível no seu país" e oferecer a lista de espera.

### T2. Onboarding (assistente em etapas, com progresso salvo)

1. País de residência e nacionalidade. Se não for Argentina, encerrar com lista de espera.
2. Dados pessoais: nome completo como no documento, data de nascimento, documento (DNI) e CUIL/CUIT, e-mail, telefone.
3. Endereço de residência.
4. Perfil de investidor (suitability): objetivo, horizonte, renda, patrimônio aproximado, experiência, tolerância a risco. Perguntas vêm da API (`GET /onboarding/questionnaire`) para o jurídico poder ajustar sem deploy.
5. Origem dos recursos e ocupação. Pergunta se é pessoa politicamente exposta (PEP).
6. Verificação de identidade: foto do documento e prova de vida. Será um SDK de fornecedor (Sumsub, Persona ou Onfido, ainda não escolhido). Fazer um componente `IdentityVerification` com interface própria e um mock que aprova após 2 segundos.
7. Termos e divulgações: contrato de consultoria, divulgação de custos, política de privacidade, consentimento para enviar dados à IBKR. Cada um com checkbox próprio e link para o texto completo.
8. Revisão e envio. Mostrar resumo e enviar (`POST /onboarding/submit`).

Requisitos: cada etapa salva rascunho no servidor; voltar não perde dados; validação de formato no front (CUIT com dígito verificador, e-mail, idade mínima de 18 anos).

### T3. Status da conta

Mostra em que ponto está a abertura: `draft` → `submitted` → `kyc_review` → `ibkr_pending` → `open` (ou `action_required`, `rejected`, `restricted`).

- `ibkr_pending`: "A Interactive Brokers está analisando sua conta. Isso costuma levar alguns dias úteis." Nenhuma instrução de depósito aparece aqui (falha B2).
- `action_required`: lista de pendências com botão para enviar cada documento (espelha os pedidos da IBKR; Stress Test 3.2).
- `rejected`: mensagem neutra, sem motivo detalhado, e contato do suporte.
- `open`: celebrar e levar à criação do plano de aporte.

### T4. Início (dashboard)

- Valor total (investido + em caixa + em trânsito), em USD.
- Cartões: "Próximo aporte" (data e valor do plano), "Aportes em andamento" (com o estado atual), "Próxima janela de investimento".
- Faixa de pendências, se houver.
- Sem gráfico de rentabilidade diária no piloto; se houver gráfico, usar horizonte longo e aviso de que rentabilidade passada não garante futura.

### T5. Plano de aporte mensal

- Valor mensal (mínimo vindo de `config.minRecurringUsd`, hoje US$250), dia do mês e trilho (`ar_usdc` padrão, `ar_swift` alternativa).
- Prévia de custos estimada por aporte (T6, passo 3).
- Pausar, retomar e editar plano. Cancelar pede confirmação.
- Observação: o backend ainda não agenda recorrências. A tela deve existir e gravar o plano via API; o lembrete mensal vira notificação "Hora do seu aporte" que leva ao T6 com o valor preenchido.

### T6. Novo aporte (avulso ou do plano)

1. Valor em USD. Validar mínimo (`config.minDepositUsd`, a confirmar) e, no Brasil, avisar que acima de US$10k o trilho muda.
2. Trilho: a API devolve os trilhos disponíveis e o recomendado (`POST /deposits/quote`). Mostrar diferenças de custo e prazo em linguagem simples.
3. Prévia de custos (obrigatória): tabela com cada custo (IOF quando houver, spread de câmbio, taxa do trilho, custo de alocação, taxa de consultoria se aplicável), total em USD e em %, valor que chega para investir e validade da cotação com contagem regressiva.
4. Confirmar (`POST /deposits` com `quoteId` e chave de idempotência gerada no front). Desabilitar o botão após o clique para não duplicar.
5. Instruções (T7).

### T7. Instruções de depósito

USDC (`ar_usdc`):

- Token: USDC. Rede: a que a API indicar (`network`), em destaque e travada.
- Endereço com botão copiar e QR code; memo/tag se a API enviar.
- Avisos fixos: "Envie somente USDC nesta rede. Outro token ou rede pode resultar em perda dos fundos." "Tem USDT? Converta para USDC na sua exchange antes de enviar."
- No primeiro depósito: recomendar um envio de teste pequeno.

SWIFT (`ar_swift`):

- Dados bancários vindos da API (beneficiário, conta, banco, SWIFT/BIC, referência obrigatória).
- Aviso: a transferência precisa sair de uma conta no nome do cliente (depósito de terceiros é devolvido).
- Aviso de tarifas fixas do banco do cliente.

### T8. Detalhe do aporte

Linha do tempo da seção 6, valores (enviado, custos, creditado, investido), trilho, cotação usada, data prevista de investimento e, se `returned`, o motivo.

### T9. Carteira

- Valor total e divisão: investido, em caixa, em trânsito.
- Lista de posições: nome do ETF, ISIN, quantidade (ações inteiras), valor em USD, peso na carteira e peso-alvo do modelo.
- Explicação curta de cada ETF (texto vindo da API).
- Data e hora da última atualização (os dados vêm da reconciliação diária com a IBKR; não são em tempo real).
- Link "Ver extratos oficiais na Interactive Brokers".

### T10. Histórico

Lista de aportes, mais recentes primeiro, com filtro por estado. Clique abre o T8.

### T11. Pendências

Documentos pedidos, aportes aguardando o cliente (`deposit_notified`), avisos de compliance e termos novos para aceitar. Cada item com uma ação.

### T12. Perfil e configurações

Dados pessoais (somente leitura; alterações via suporte), idioma, notificações (e-mail e push), refazer perfil de investidor, documentos e termos aceitos, sair. Link para o portal da IBKR para saques, com a explicação de que o saque vai só para conta bancária no nome do cliente.

### T13. Ajuda

FAQ com textos aprovados pelo jurídico (seção 10) e canal de suporte.

**Estados obrigatórios em todas as telas:** carregando (skeleton), vazio, erro de rede com "tentar de novo", sessão expirada e manutenção.

## 8. Contrato de API proposto e tipos TypeScript

Este contrato é uma proposta do front, baseada nos nomes do código atual. Ele precisa ser revisado com o Dozo antes de virar definitivo. O front deve isolar todas as chamadas numa camada `api/` para que mudanças aqui não se espalhem.

Convenções:

- Base: `/api/v1`. JSON. Autenticação por bearer token (OIDC).
- Dinheiro sempre em centavos inteiros de USD (`amountCents: number`), como no `ledger.ts`. O front formata.
- Datas em ISO 8601 UTC. O front converte para o fuso do cliente.
- Toda criação (`POST /deposits`, `POST /plans`) envia o header `Idempotency-Key` (UUID gerado no front).
- Erros: `{ "error": { "code": "quote_expired", "message": "..." } }`. O front traduz pelo `code`, não pela `message`.

Endpoints:

| Método e rota | Uso | Tela |
|---|---|---|
| `GET /config` | Mercados ativos, mínimos, teto eFX, trilhos por país | Todas |
| `GET /me` | Cliente, status da conta, idioma | T1, T3, T12 |
| `GET /onboarding` | Rascunho e etapa atual | T2 |
| `PUT /onboarding/{step}` | Salvar uma etapa | T2 |
| `GET /onboarding/questionnaire` | Perguntas de suitability | T2 |
| `POST /onboarding/submit` | Enviar cadastro | T2 |
| `GET /account` | Status da conta e pendências | T3, T11 |
| `POST /account/documents` | Enviar documento pendente (multipart) | T3, T11 |
| `GET /portfolio` | Saldos por balde e posições | T4, T9 |
| `GET /plans` · `POST /plans` · `PATCH /plans/{id}` | Plano mensal | T5 |
| `POST /deposits/quote` | Trilhos disponíveis e prévia de custos | T6 |
| `POST /deposits` | Criar aporte a partir de uma cotação | T6 |
| `GET /deposits` · `GET /deposits/{id}` | Lista e detalhe com histórico | T7, T8, T10 |
| `GET /notifications` | Avisos e pendências | T11 |

Tipos (copiar para `src/api/types.ts`):

```ts
export type Country = "AR" | "BR";
export type Locale = "es" | "pt" | "en";

export type Rail = "ar_usdc" | "ar_swift" | "br_efx" | "br_fxbank";

export type DepositState =
  | "kyc_passed"
  | "ibkr_open"
  | "deposit_notified"
  | "partner_collected"
  | "fx_executed"
  | "wire_sent"
  | "broker_credited"
  | "invested"
  | "returned";

export type AccountStatus =
  | "draft" | "submitted" | "kyc_review" | "ibkr_pending"
  | "action_required" | "open" | "restricted" | "rejected";

export type BlockReason =
  | "ibkr_not_open" | "ibkr_restricted" | "compliance_hold"
  | "quote_expired" | "pix_med_hold" | "market_not_live";

export interface AppConfig {
  liveMarkets: Country[];          // hoje ["AR"]
  minRecurringUsdCents: number;    // hoje 25000
  minDepositUsdCents: number;      // a confirmar
  efxCapUsdCents: number;          // 1000000 (Brasil)
  railsByCountry: Record<Country, Rail[]>;
  investmentWindowDay: number;     // dia do mês da janela (a confirmar)
  ibkrPortalUrl: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  country: Country;
  locale: Locale;
  accountStatus: AccountStatus;
}

export interface PendingItem {
  id: string;
  kind: "document" | "deposit_action" | "terms" | "notice";
  title: string;
  description: string;
  dueAt?: string;
  depositId?: string;
}

export interface Account {
  status: AccountStatus;
  ibkrAccountMasked?: string;      // ex.: "U****1234"; nunca credenciais
  pending: PendingItem[];
  blockReasons: BlockReason[];
}

export interface CostLine {
  kind: "iof" | "fx_spread" | "rail_fee" | "allocation_min" | "advisory_fee";
  label: string;
  amountCents: number;
  percent: number;                 // 0.011 = 1,1%
  estimated: boolean;              // true quando é valor (assumed) do config
}

export interface RailOption {
  rail: Rail;
  recommended: boolean;
  costs: CostLine[];
  totalCostCents: number;
  netToInvestCents: number;
  expectedDays: { min: number; max: number };
}

export interface Quote {
  id: string;
  amountCents: number;
  options: RailOption[];
  expiresAt: string;
}

export interface DepositInstructionsUsdc {
  type: "usdc";
  token: "USDC";
  network: string;                 // vindo da API; nunca fixo no front
  address: string;
  memo?: string;
}

export interface DepositInstructionsWire {
  type: "wire";
  beneficiaryName: string;
  accountNumber: string;
  bankName: string;
  swiftBic: string;
  reference: string;               // obrigatória
}

export interface StateEvent {
  state: DepositState;
  at: string;
}

export interface Deposit {
  id: string;
  rail: Rail;
  state: DepositState;
  amountCents: number;
  costs: CostLine[];
  creditedCents?: number;
  investedCents?: number;
  history: StateEvent[];
  expectedBy?: string;             // prazo esperado do estado atual
  nextInvestmentWindow?: string;
  instructions?: DepositInstructionsUsdc | DepositInstructionsWire;
  returnReason?: string;
  createdAt: string;
}

export interface Position {
  isin: string;                    // UCITS, nunca começa com "US"
  name: string;
  shares: number;                  // ações inteiras
  valueCents: number;
  weight: number;
  targetWeight: number;
  description: string;
}

export interface Portfolio {
  totalCents: number;
  buckets: { inFlightCents: number; ibkrCashCents: number; investedCents: number; feesPaidCents: number };
  positions: Position[];
  asOf: string;                    // última reconciliação com a IBKR
}

export interface Plan {
  id: string;
  amountCents: number;
  dayOfMonth: number;
  rail: Rail;
  status: "active" | "paused" | "cancelled";
  nextRunAt?: string;
}
```

**Mock:** usar MSW (Mock Service Worker) com dados de exemplo que cubram todos os estados de `DepositState`, `AccountStatus` e `BlockReason`. Criar cenários selecionáveis em desenvolvimento (por exemplo `?scenario=ibkr_pending`, `?scenario=returned`) para testar cada tela.

## 9. Requisitos não funcionais

Stack recomendada (o backend é TypeScript; usar o mesmo permite compartilhar os tipos da seção 8):

| Camada | Escolha | Observação |
|---|---|---|
| Linguagem | TypeScript estrito | `strict: true` |
| Framework | React + Vite (SPA) | Next.js só se houver necessidade de SSR; não há no piloto |
| Rotas | React Router ou TanStack Router | |
| Dados do servidor | TanStack Query | Polling a cada 30 s na tela de detalhe do aporte |
| Formulários | React Hook Form + Zod | Schemas Zod reaproveitáveis para validar respostas da API |
| Estilo | Tailwind CSS + componentes acessíveis (Radix ou shadcn/ui) | |
| i18n | i18next ou FormatJS | ES, PT, EN; nenhum texto fixo no código |
| Mock | MSW | Cenários por query string |
| Testes | Vitest + Testing Library; Playwright para fluxos | |
| Componentes isolados | Storybook | Uma história por estado de cada tela |

Onde o código vai morar: a decidir com o Dozo. Sugestão: pasta `web/` na raiz do repositório, separada de `App/` (backend). A branch `Arquitetura` apagou a landing page; não fazer merge na `main` sem alinhar, para o site não sumir. Criar uma branch própria a partir de `Arquitetura`, por exemplo `frontend`.

Estrutura sugerida:

```
web/
  src/
    api/          cliente HTTP, types.ts, hooks de query
    mocks/        handlers MSW e cenários
    features/
      onboarding/
      account/
      deposits/
      plans/
      portfolio/
      pending/
      profile/
    components/   UI compartilhada (Money, Timeline, CostTable, CopyField, QrCode)
    i18n/         es.json, pt.json, en.json
    lib/          formatação de dinheiro e datas, validação de CUIT/CPF
```

Internacionalização e formatação:

- Moeda: sempre USD, formatada pelo locale (`US$ 1.234,56` em ES/PT; `$1,234.56` em EN). Usar `Intl.NumberFormat`.
- Datas: `Intl.DateTimeFormat` no fuso do navegador.
- Textos com plural e variáveis pela biblioteca de i18n.

Segurança:

- Nunca guardar tokens em `localStorage`; preferir cookie httpOnly emitido pelo backend ou memória com refresh silencioso.
- Nenhuma credencial ou chave da IBKR ou de parceiros no front. O front nunca fala direto com a IBKR.
- Dados pessoais nunca em URL ou query string.
- Sem dados pessoais em logs e ferramentas de analytics.
- Content Security Policy restrita; sem scripts de terceiros além do SDK de KYC e do analytics aprovado.
- O app não inicia saques nem altera contas bancárias de destino (Stress Test 3.8).
- Sessão expira por inatividade (sugestão: 15 minutos) com aviso antes.

**Acessibilidade:** WCAG 2.1 AA; navegação por teclado; contraste; rótulos em todos os campos; linha do tempo legível por leitor de tela.

**Performance:** mobile-first; bundle inicial abaixo de 200 KB gzip; funciona em 3G lento; carregamento por rota.

**Observabilidade:** registrar erros de front (Sentry ou similar) sem dados pessoais; eventos de funil do onboarding e do aporte para medir abandono.

## 10. Compliance e textos

Os pareceres jurídicos e tributários ainda não foram assinados. Até lá, o app não pode fazer afirmações que dependam deles. Todo texto voltado ao cliente fica em arquivos de i18n e passa por revisão jurídica antes do piloto.

Não dizer (até o parecer):

| Evitar | Por quê | Usar no lugar |
|---|---|---|
| "Sim, é legal onde você mora" | Não há parecer da CNV (Argentina) nem da CVM (Brasil) | Remover a pergunta ou responder "Estamos em fase de piloto fechado. Consulte nossos termos." |
| "Evite totalmente o imposto de herança" / "proteção acima de US$60 mil" | Depende do parecer sobre a estrutura UCITS | "A carteira usa fundos domiciliados na Irlanda. Detalhes fiscais nos termos." com `TODO(compliance)` |
| Promessas de rentabilidade ou "sem risco" | Regra de marketing de consultores nos EUA (SEC Marketing Rule) | Sempre o aviso de que investimentos têm risco e resultados passados não garantem futuros |
| "Seu dinheiro fica com a OpenDollars" | Falso; o dinheiro fica na IBKR no nome do cliente | "Sua conta e seus investimentos ficam na Interactive Brokers, no seu nome." |
| Nome de parceiros sem contrato assinado | Parceiros ainda não definidos | Termos genéricos: "parceiro de câmbio licenciado" |
| Cartão de débito como disponível | Fase 3 | "Em breve" |

Sempre mostrar:

- Prévia de custos completa antes de cada aporte (também é exigência de transparência para o consumidor).
- Que a OpenDollars é consultora e a Interactive Brokers é a corretora e custodiante.
- Aviso de risco em telas de carteira e plano.
- Data da última atualização dos valores.
- Links para termos, política de privacidade e contrato de consultoria (textos ainda em rascunho; usar placeholders marcados).

**Dados pessoais:** coletar só o necessário para KYC e suitability; mostrar o consentimento para envio de dados à IBKR (EUA) de forma explícita. Argentina: Lei 25.326. Brasil: LGPD.

## 11. Plano de entrega e critérios de aceite

Entregar em etapas. Cada etapa termina com testes passando, histórias no Storybook e uma demonstração com o mock.

1. **Base:** projeto `web/`, TypeScript estrito, rotas, i18n (ES/PT/EN), tema, `src/api/types.ts`, cliente HTTP, MSW com cenários, componentes base (`Money`, `Timeline`, `CostTable`, `CopyField`, `QrCode`, estados de carregando, vazio e erro).
2. **Onboarding e status da conta:** T1, T2, T3. Inclui `IdentityVerification` mockado.
3. **Aporte:** T6, T7, T8. Prévia de custos, cotação com validade, instruções USDC e SWIFT, linha do tempo.
4. **Carteira e início:** T4, T9, T10.
5. **Plano mensal e pendências:** T5, T11.
6. **Perfil e ajuda:** T12, T13.
7. **Acabamento:** acessibilidade, performance, textos revisados pelo jurídico, troca do mock pela API real quando ela existir.

Critérios de aceite principais:

- Nenhuma instrução de depósito aparece enquanto `accountStatus` não for `open`.
- Não é possível confirmar um aporte sem ver a prévia de custos.
- Cotação expirada bloqueia a confirmação e oferece nova cotação.
- Plano mensal abaixo de `minRecurringUsdCents` é rejeitado com explicação.
- Tela USDC mostra token e rede vindos da API, botão copiar, QR code e aviso sobre USDT e rede errada.
- Tela SWIFT mostra a referência obrigatória e o aviso de conta no nome do cliente.
- A linha do tempo esconde `fx_executed` e `wire_sent` para `ar_usdc`.
- Clique duplo em "Confirmar" não cria dois aportes (mesma `Idempotency-Key`).
- Todos os textos existem em ES, PT e EN; nenhum texto fixo no código.
- Brasil e trilhos `br_*` não aparecem quando `BR` não está em `liveMarkets`.
- O app não tem nenhuma tela de saque nem campo para credenciais da IBKR.
- Cada tela tem estados de carregando, vazio e erro testados.
- Todos os cenários de mock (`DepositState`, `AccountStatus`, `BlockReason`) renderizam sem erro.

## 12. Perguntas em aberto e glossário

Perguntas para o Dozo (backend):

- O contrato da seção 8 está de acordo? Nomes de rotas e campos podem mudar.
- Onde o front vai morar (pasta `web/`, branch `frontend`) e como fica a landing page na `main`?
- Qual o aporte avulso mínimo (`minDepositUsdCents`)? O recorrente é US$250.
- Em que dia do mês roda a janela de investimento?
- Como o backend vai expor `costPreview` e `mayCollect` (dentro de `POST /deposits/quote`?).
- Quando o trilho `ar_usdc` deixa de passar por `fx_executed` e `wire_sent`?
- Qual provedor de login (OIDC) e de KYC será usado?
- Notificações push: haverá app nativo ou só web (PWA)?
- Qual a taxa de consultoria (o Stress Test sugere 0,5% a 0,75% ao ano) e como mostrar?

Decisões já tomadas (recomendações do Stress Test, válidas se ninguém decidir o contrário): mínimo de US$250 por mês, executado mensalmente; trilho separado de banco de câmbio para aportes acima de US$10k no Brasil; corretora reserva avaliada agora e assinada depois do piloto; OpenDollars paga o mínimo de alocação da IBKR no piloto.

Glossário:

| Termo | Significado |
|---|---|
| IBKR | Interactive Brokers, corretora e custodiante nos EUA |
| RIA | Registered Investment Adviser, consultor de investimentos registrado nos EUA |
| UCITS | Fundos europeus regulados; aqui, ETFs domiciliados na Irlanda que replicam índices americanos |
| ISIN | Código internacional de um título; ETFs irlandeses começam com "IE" |
| Acumulação | ETF que reinveste dividendos em vez de pagar |
| Trilho (rail) | Caminho pelo qual o dinheiro entra (`ar_usdc`, `ar_swift`, `br_efx`, `br_fxbank`) |
| eFX | Serviço brasileiro de transferência internacional; teto de US$10k por operação para investimentos (Res. BCB 561) |
| IOF | Imposto brasileiro sobre câmbio; 1,1% quando registrado como investimento |
| MED | Mecanismo de devolução do Pix por fraude |
| MEP | Dólar comprado legalmente via bolsa na Argentina |
| USDC | Stablecoin lastreada em dólar, aceita pela IBKR via Zerohash |
| KYC | Verificação de identidade do cliente |
| Suitability | Perfil de investidor, exigido para dar recomendação |
| Janela de execução | Momento mensal em que as ordens de todos os clientes são enviadas juntas |
| Reconciliação | Comparação diária dos saldos do OpenDollars com o extrato da IBKR |
| B1 a B6 | As seis falhas encontradas no Stress Test (depósito de terceiros, dinheiro antes da conta, custo de aporte pequeno, saque, MED, ponto único de falha) |
