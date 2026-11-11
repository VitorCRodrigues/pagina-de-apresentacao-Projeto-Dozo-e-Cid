# Decisões do app iOS

Complementa ../../web/docs/decisions.md. Cada item tem um comentário TODO no código.

## TODO(decisão)

| # | Tema | Decisão para o iOS | Origem |
|---|---|---|---|
| 1 | Enums vindos da API (DepositState, AccountStatus, BlockReason, Rail) | Valor desconhecido decodifica para .unknown(String), preservado no encode. A UI mostra um estado ou rótulo genérico. Motivo: versões antigas do app ficam semanas em uso depois de o backend ganhar um valor novo. Trilho .unknown nunca é oferecido para criar aporte (AppConfig.railsOnOffer). Status de conta .unknown cai na tela de Status da conta com texto genérico e acesso ao suporte, nunca nas abas. Dinheiro continua estrito. | 10/11/2026 |
| 1a | Country desconhecido no config | Extensão do item 1: em GET /config, um país que esta versão não conhece é descartado de liveMarkets e de railsByCountry, em vez de derrubar o config inteiro. Me.country, CostLine.kind, PendingItem.kind e PlanStatus continuam estritos. A confirmar. | 10/11/2026 |
| 2 | Formatação de dinheiro e percentuais | Feita no core, de forma determinística, sem NumberFormatter (cujo ICU difere entre Linux, Windows e iOS). Saída idêntica às strings dos testes do web (Intl es-AR, pt-BR, en-US), byte a byte, incluindo o espaço não separável e o sinal de menos U+2212. | 09/11/2026 |
| 3 | Sessão | Access token só em memória; refresh token no Keychain com kSecAttrAccessibleWhenUnlockedThisDeviceOnly; limpeza total em qualquer saída (botão, 15 min de inatividade, sessão expirada). A última atividade fica guardada junto do refresh token para que uma sessão parada 15 min não volte ao reabrir o app. Na primeira execução após instalar, o Keychain é apagado (itens do Keychain sobrevivem à desinstalação). | 09/11/2026 |
| 4 | Fonte | Um arquivo só, InterVariable.ttf do release oficial rsms/inter v4.1 (versão 4.001, eixos wght 100–900 e opsz 14–32), com a licença OFL. Mesma versão do web; o web usa o build da Fontsource da mesma versão. opsz 32 = Inter Display. | 10/11/2026 |
| 5 | Fase 0 só com mock | O app sempre usa o MockServer em memória e o MockAuthProvider. A origem real da API e o provedor OIDC chegam com o backend (PRD seção 12). Sem tela de login (T1) nem upload de documentos ainda. | 10/11/2026 |
| 6 | Textos | Localizable.xcstrings é gerado a partir dos JSON do web por scripts/sync-strings-from-web.py. Chaves só do iOS (status desconhecido, abas "Próximamente") ficam no script, com TODO(compliance). | 10/11/2026 |
| 7 | Linguagem de extrato, sem cartões | O Card saiu do design system. Listas de valores são Ledger (réguas gray200 de 1 pt entre as linhas, uma acima e uma abaixo); blocos têm SectionHeader; avisos são Notice (régua lateral de 2 pt, sem fundo colorido); estados de página são tipográficos (régua grafite, título, uma frase, uma ação) e o carregamento é um esqueleto estático. A única superfície é o bloco marinho do saldo total em Início (raio de 12 pt), como o BalanceCard do web. | 11/11/2026 |
| 8 | Só modo claro no piloto | UIUserInterfaceStyle = Light no Info.plist (project.yml), para teclado, seletores, folhas e barras não ficarem escuros sobre o creme. O web só tem tema claro. TODO: um tema escuro, se houver, nasce junto com o web, com pares de contraste próprios. | 11/11/2026 |
| 9 | Tokens de cor no core | Os valores ficam em OpenDollarsCore/Presentation/ColorTokens.swift (só Foundation) e o ODColor do app lê deles. Assim o contraste AA dos pares aprovados (ColorPairs, os mesmos do contrast.ts do web) e a igualdade com web/src/styles/tokens.css são testados no swift test. Dourado só é par aprovado sobre marinho, com o critério de texto (4,5:1). Controles desabilitados ficam fora da lista, isentos pelo WCAG 1.4.3, como no web. | 11/11/2026 |
| 10 | Tipografia | Mesma escala do typography.css do web (tamanho, altura de linha, peso, tracking em em). O modificador .odText(_:) escala pelo dynamicTypeSize do ambiente SwiftUI (não pelo trait da tela), para que os Previews e qualquer .dynamicTypeSize(_:) mostrem o tamanho pedido. Algarismos tabulares e alinhados pelo descritor da fonte (kNumberSpacingType, kNumberCaseType), não por .monospacedDigit(), que não é confiável numa fonte variável carregada por CTFont. Negrito de Acessibilidade soma 100 ao eixo wght. Botões usam o estilo label (14 pt, 600), como no web. | 11/11/2026 |
| 11 | Regras de design testadas | DesignRulesTests (core) varre o código do app, sem comentários, e falha com gradiente, emoji, SF Symbols de moeda, foguete ou tendência, cor do sistema (Color.green, .foregroundStyle(.red)) e Color(...) fora do DesignSystem. Tokens da marca (ODColor.green700) não são cor do sistema. O teste não sabe o que uma cor significa: "verde ou vermelho para ganho ou perda" fica na documentação do ODColor e na revisão. | 11/11/2026 |
| 12 | Catálogo de componentes | DesignCatalogView, só em DEBUG, abre com o argumento -catalog, com textos reais do app. CatalogScreenshotTests tira uma captura por página no tamanho padrão e em Acessibilidade L, no iPhone 15 e no iPhone SE. Os títulos das seções (devCatalog.*) são chaves só do iOS, nunca vistas pelo cliente. | 11/11/2026 |
| 13 | Pendências em Início | O aviso "Tenés N pendientes" aparece sem link até a aba Pendientes existir. | 11/11/2026 |

## TODO(api)

| # | Ponto | Proposta ao Dozo |
|---|---|---|
| 1 | CostLine.percent é Double (0.011 = 1,1%) | Enviar em pontos-base inteiros (ex.: percentBasisPoints: 110), para nenhum número de ponto flutuante cruzar o contrato. Até lá, o valor é só exibido, nunca usado em conta. |
