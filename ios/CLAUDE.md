# OpenDollars — App do cliente iOS (ios/)

## Fontes da verdade

- Funcional, estados, API, compliance: ../web/docs/prd-frontend.md (vence em qualquer conflito)
- Visual e tom: ../web/docs/brand-brief.md
- Conflitos já resolvidos: ../web/docs/decisions.md
- Lacunas do contrato de API: ../web/docs/api-gaps.md
- Decisões próprias do iOS: docs/decisions.md (nesta pasta)
- Referência funcional: o app em ../web/src. Reimplementar de forma idiomática em Swift, nunca traduzir linha a linha.

## Produto em uma frase

Conta de investimento em USD, de longo prazo, com aportes mensais. O cliente não opera.
OpenDollars é consultora (RIA); a Interactive Brokers é corretora e custodiante; o dinheiro fica no nome do cliente.
Piloto: Argentina, espanhol, ~50 contas, celular.

## Estrutura

- OpenDollarsCore/: Swift Package só com Foundation (sem UIKit/SwiftUI). Modelos, Money, validação, cliente HTTP, sessão, mocks. Compila e testa no Linux (WSL), no Windows e no macOS.
- OpenDollars/: app SwiftUI, iOS 17+. Só apresentação; regra de negócio vai para o core.
- OpenDollarsUITests/: testes de interface e screenshots.
- project.yml: XcodeGen. O .xcodeproj é gerado e nunca vai para o git.

## Regras inegociáveis

- Nomes de estados, trilhos e campos exatamente como na seção 8 do PRD e no api-gaps (raw values ar_usdc, deposit_notified...). Sem sinônimos.
- Mínimos, IOF, teto, dia da janela e trilhos vêm de GET /config. Nunca constantes de negócio no código.
- Dinheiro sempre em Money (centavos Int64). Nunca Double, Float ou Decimal para somar ou guardar dinheiro. Formatar só na apresentação, com o MoneyFormatter do core.
- Valor desconhecido em DepositState, AccountStatus, BlockReason e Rail decodifica para .unknown(String) e a UI mostra um estado genérico. Dinheiro é estrito: um valor não inteiro faz a resposta falhar.
- Trilho .unknown nunca aparece como opção para criar aporte.
- Nenhuma instrução de depósito enquanto accountStatus != .open.
- Nenhum aporte confirmado sem a prévia de custos visível. Cotação expirada bloqueia o botão.
- Uma Idempotency-Key por intenção de aporte; o botão desabilita após o toque.
- ar_usdc: esconder fx_executed e wire_sent; partner_collected aparece como "USDC recebido".
- Nunca tela de saque, nunca campo de credencial da IBKR, nunca chamada direta à IBKR.
- Sessão: access token só em memória. Refresh token só no Keychain, com kSecAttrAccessibleWhenUnlockedThisDeviceOnly. Nunca token em UserDefaults, arquivo ou log. Qualquer saída (botão, 15 min de inatividade, sessão expirada) limpa tudo: tokens, Keychain, caches e Idempotency-Keys pendentes.
- Nenhum dado pessoal em log, URL ou analytics. No app, só os.Logger, com privacy: .private em qualquer valor vindo da API; nunca print. O core não registra log.
- Brasil e trilhos br_* só aparecem se "BR" estiver em config.liveMarkets.
- Nenhum texto fixo no código: tudo em Localizable.xcstrings (es, pt, en). ES é o idioma de desenvolvimento.
- Espanhol com voseo argentino (vos, enviá, tenés); botões no infinitivo.
- Texto ao cliente segue a seção 10 do PRD. Na dúvida: texto neutro + TODO(compliance).
- Algo indefinido: opção mais simples + comentário TODO(decisão) + registro em docs/decisions.md + seguir em frente.
- Ponto do contrato a propor ao backend: comentário TODO(api) + registro em docs/decisions.md.

## Design

- Estética "private banking digital": fundo creme, marinho, muito respiro. Um foco e uma ação primária por tela.
- Cores só pelos tokens de OpenDollars/DesignSystem (mesmos valores de ../web/src/styles/tokens.css). Nunca cor solta numa view.
- Uma família só: Inter variável (InterVariable.ttf, eixos wght e opsz). Títulos de destaque e saldo total com opsz 32 (Inter Display). Valores em coluna com algarismos tabulares.
- Saldo total: creme sobre marinho; centavos na mesma linha de base, menores e mais leves. Dourado só no rótulo "Total".
- Proibido: gradientes, neon, emoji, ícones de moeda/foguete, linguagem de hype ou de cripto, gráfico de rentabilidade diária.
- Referência de largura: 375 pt (iPhone SE). Dynamic Type, VoiceOver e Reduzir Movimento respeitados.

## Testes e verificação

- Core, no WSL (o Swift nativo do Windows é bloqueado pelo Smart App Control):
  wsl -d Ubuntu -- bash -lc "cd /mnt/c/Users/Vitor/Documents/GitHub/pagina-de-apresentacao-Projeto-Dozo-e-Cid/ios/OpenDollarsCore && swift test --scratch-path ~/.build/opendollars-core"
  Atalho com saída filtrada: wsl -d Ubuntu -- bash -lc "bash /mnt/c/Users/Vitor/Documents/GitHub/pagina-de-apresentacao-Projeto-Dozo-e-Cid/ios/scripts/test-core-wsl.sh"
- Textos: depois de mudar a cópia no web, rodar python -I ios/scripts/sync-strings-from-web.py. Nunca editar o Localizable.xcstrings à mão.
- Regra de apresentação que dá para testar (roteamento, linha do tempo, chaves de texto) vai para OpenDollarsCore/Presentation, com teste.
- Windows nativo: verificado pelo job core-windows do workflow .github/workflows/ios.yml.
- App e UI tests: só compilam no GitHub Actions (job ios, macOS).
- Testes antes do código. Swift Testing (import Testing) no core; XCTest só nos UI tests.

## Definição de pronto

- swift test passando no WSL e CI verde (core-windows e ios).
- Nunca faça git commit nem git push. Deixe as mudanças no working tree. Ao terminar, liste os arquivos alterados agrupados por assunto e sugira uma mensagem de commit para cada grupo.
- Mensagens de commit sugeridas em inglês, no padrão Conventional Commits.
- Não mexer em App/ (backend), em web/ nem na landing page da branch main.
