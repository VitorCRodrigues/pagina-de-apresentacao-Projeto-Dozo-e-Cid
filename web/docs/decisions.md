# Decisões sobre conflitos entre documentos

| # | Conflito | Onde aparece | Decisão para o front |
|---|---|---|---|
| 1 | Proteção sucessória como "diferencial real" | Brief, seção 2 | PRD proíbe prometer até o parecer. Usar só "a carteira usa fundos domiciliados na Irlanda; detalhes fiscais nos termos" + TODO(compliance) |
| 2 | Cartão de débito como item 03 da hierarquia | Brief | "Em breve" no Perfil. Nunca como disponível |
| 3 | Relatórios fiscais automáticos | Brief e Investor Research | Item de navegação desabilitado "Em breve" |
| 4 | "Send a Pix" como experiência central | Investor Research | Piloto é Argentina com USDC/SWIFT. Pix só atrás de feature flag desligada |
| 5 | Lançamento simultâneo Brasil e Argentina | Investor Research | Só liveMarkets da API. Nada de BR na interface hoje |
| 6 | Dado de abertura: bolsa BR -50–70% desde 2008 | Brief | Não entra no app logado (é marketing). Se algum dia entrar, usar o dado MSCI 2010–2025 do Investor Research, com fonte |
| 7 | "Não usar linguagem de cripto" vs instruções USDC obrigatórias | Brief x PRD, seção 5 | USDC aparece só como meio de pagamento, com tom bancário: nome técnico exato, sem ícones de moeda, sem gráficos de preço |
| 8 | Paleta azul-marinho + teal no PDF de investidores | Investor Research | App usa a paleta do brief (marinho, verde maduro, dourado, creme). O teal do PDF não entra |

## Decisões de 27/10

| # | Tema | Decisão para o front |
|---|---|---|
| 9 | Espanhol | Usar voseo argentino (vos, enviá, tenés), mantendo o tom sóbrio. Botões continuam no infinitivo ("Copiar", "Reintentar"). |
| 10 | Botão dourado | A variante `key` do Button foi removida. Botão primário sempre marinho. Dourado só no saldo total sobre marinho. |
| 11 | Textos proibidos no app, além da seção 10 do PRD | Promessas fiscais ("estrutura fiscal resolvida", "nunca mais do que deve"); "nunca misturamos com dinheiro de outros clientes"; "KYC em minutos". |
| 12 | Idioma dos textos da API | O front envia `Accept-Language`. Códigos (`DepositState`, `Rail`, `CostLine.kind`, `BlockReason`, `error.code`) são traduzidos no front. Conteúdo editorial (questionário, `Position.description`, `PendingItem.title`/`description`, `returnReason`) vem traduzido da API. `CostLine.label` não é exibido. |
| 13 | Navegação | Histórico (T10) fica dentro de Aportar. Ajuda (T13) e "Relatórios fiscais — Em breve" ficam dentro de Perfil. |
| 14 | Conta `restricted` depois de aberta | A navegação continua. Aportes ficam bloqueados, com nota explicando e acesso ao suporte. |
| 15 | `Portfolio.totalCents` | Investido + caixa + trânsito. Custos pagos (`feesPaidCents`) não entram no total. |
| 16 | Plano mensal | Trilho obrigatório. `dayOfMonth` de 1 a 28. |
| 17 | Prazo de abertura de conta | Sempre "alguns dias úteis". Nunca "minutos". |
| 18 | Branch | O front vive na branch `Front-end-web`. Nenhum merge na `main` sem alinhar com o Dozo. |
