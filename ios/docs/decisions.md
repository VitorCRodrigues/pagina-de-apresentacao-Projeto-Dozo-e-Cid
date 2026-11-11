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

## TODO(api)

| # | Ponto | Proposta ao Dozo |
|---|---|---|
| 1 | CostLine.percent é Double (0.011 = 1,1%) | Enviar em pontos-base inteiros (ex.: percentBasisPoints: 110), para nenhum número de ponto flutuante cruzar o contrato. Até lá, o valor é só exibido, nunca usado em conta. |
