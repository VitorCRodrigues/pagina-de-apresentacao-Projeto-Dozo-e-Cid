# Itens em aberto do front

Inventário de todos os `TODO(compliance)` e `TODO(decisão)` do código, por tela, com o que falta para fechar cada um e quem decide. `src/i18n/legal-docs.test.ts` falha se um arquivo com TODO não aparecer aqui.

Quem decide: **Jurídico** (pareceres e textos), **Dozo** (backend e contrato de API), **Produto** (escopo e fornecedores).

## T1 Entrada

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| compliance | `src/features/session/EntryScreen.tsx` | Título e frase do piloto fechado | Aprovar os textos `entry.*` | Jurídico |
| compliance | `src/features/session/EntryScreen.tsx` | "Ver términos" ainda sem destino | Publicar o texto dos termos e ligar o link | Jurídico |

## T2 Onboarding

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/onboarding/countries.ts` | Lista curta de países de residência e nacionalidade | Definir a lista final | Produto |
| compliance | `src/features/onboarding/countries.ts` | Listas de ocupação e origem dos recursos | Revisar as opções | Jurídico |
| compliance | `src/features/onboarding/steps/FundsStep.tsx` | Redação de origem dos recursos e pessoa exposta | Aprovar os textos `onboarding.funds.*` | Jurídico |
| compliance | `src/features/onboarding/steps/TermsStep.tsx` | Termos ainda em rascunho | Assinar os textos finais | Jurídico |
| decisão | `src/features/onboarding/identity/identity-provider.ts` | Fornecedor de verificação de identidade | Escolher entre Sumsub, Persona e Onfido e integrar o SDK | Produto |
| compliance | `src/mocks/fixtures.ts` | Perguntas do questionário de perfil | Definir a redação final, servida pela API | Jurídico |
| compliance | `src/mocks/db.ts` | Documentos de termos do mock são rascunhos | Substituir pelos documentos revisados | Jurídico |

## T3 Status da conta

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/account/document-rules.ts` | Tipos e tamanho aceitos nos documentos | Confirmar os limites da Interactive Brokers | Dozo |

## T4 Início

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/home/investment-window.ts` | Hora e fuso da janela de investimento | Definir; idealmente a API envia `nextInvestmentWindow` (api-gaps, item 8) | Dozo |
| decisão | `src/lib/report.ts` | Serviço de monitoramento de erros | Escolher o serviço e enviar `portfolio_total_mismatch` | Produto |

## T5 Plano mensal

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/plans/PlanScreen.tsx` | O backend ainda não agenda recorrências | Agendar e enviar o lembrete "Hora de tu aporte" | Dozo |

## T6 a T8 Aporte

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/mocks/fixtures.ts` | Mínimo do aporte avulso ainda "a confirmar" | Definir `minDepositUsdCents` | Produto |
| decisão | `src/components/CostTable.tsx` | `CostLine.label` da API é ignorado | Definir o idioma do campo ou removê-lo do contrato | Dozo |
| compliance | `src/features/deposits/instructions/ExactAmount.tsx` | Consequências de enviar um valor diferente | Aprovar `deposit.instructions.exactAmountNote` | Jurídico |
| compliance | `src/features/deposits/DepositDetailScreen.tsx` | Política de devolução depende do contrato com o parceiro | Assinar o contrato e aprovar `deposit.detail.refund` | Jurídico |

## T9 Carteira

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/portfolio/BalanceCard.tsx` | Total da API deve ser igual à soma dos baldes | Confirmar a fórmula de `totalCents` (api-gaps, item 8) | Dozo |
| compliance | `src/features/portfolio/PortfolioScreen.tsx` | Nota sobre a atualização diária | Aprovar `portfolio.asOf` | Jurídico |

## T11 Pendências

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| compliance | `src/features/pending/TermsAcceptDialog.tsx` | Termos ainda em rascunho | Assinar os textos finais | Jurídico |

## T12 Perfil

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| decisão | `src/features/profile/NotificationsSection.tsx` | Push depende de PWA ou app nativo | Escolher; hoje só grava a preferência | Produto |
| decisão | `src/features/profile/TermsSection.tsx` | Documentos enviados pelo cliente não têm rota de listagem | Definir a rota, se forem aparecer no Perfil | Dozo |
| compliance | `src/features/profile/SuitabilityScreen.tsx` | Efeito de refazer o perfil sobre a carteira não está definido | Definir o efeito e aprovar `profile.suitability.intro` | Jurídico |

## T13 Ajuda

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| compliance | `src/features/help/FaqList.tsx` | Todas as respostas do FAQ | Aprovar `help.questions.*` | Jurídico |
| decisão | `src/lib/support.ts` | Canal de suporte do piloto: só e-mail, endereço provisório | Confirmar o endereço e decidir se haverá chat ou telefone | Produto |

## Várias telas

| Tipo | Onde | O que está em aberto | O que falta para fechar | Quem decide |
|---|---|---|---|---|
| compliance | `src/api/error-messages.ts` | Mensagens de erro e de bloqueio | Aprovar `errors.*` e `blockReason.*` | Jurídico |
| compliance | `src/components/RiskNote.tsx` | Aviso de risco | Aprovar `risk.default` | Jurídico |
| decisão | `src/api/auth.ts` | Provedor OIDC | Escolher o provedor e implementar `AuthClient` | Produto |
| decisão | `src/api/auth.ts` | Renovação silenciosa do token | Implementar com o provedor escolhido | Dozo |
| decisão | `src/App.tsx` | Autenticação ainda é simulada | Trocar pelo cliente OIDC real | Dozo |
| decisão | `src/components/RouteFallback.tsx` | Fallback de rota ainda simples | Trocar pelo esqueleto de carregamento | Produto |
| decisão | `src/components/Wordmark.tsx` | Logo oficial em PNG, versões chapadas geradas por `scripts/brand-assets.py` | Receber do designer o SVG do wordmark e do símbolo chapados | Produto |
| decisão | `src/components/BrandSymbol.tsx` | Símbolo oficial em PNG, versões chapadas geradas por `scripts/brand-assets.py` | Receber do designer o SVG do wordmark e do símbolo chapados | Produto |

## Fora do código: depende do registro RIA

Nenhum texto diz "registrada" nem cita a SEC, mas sete pressupõem o status de assessora de investimentos. Estão na seção 1 de `copy-review.md`, com status "depende da confirmação do registro RIA antes do piloto". Quem confirma: Jurídico.
