# Contexto de negócio (resumo do Investor Research)

> **Contexto apenas. Não usar como fonte de texto ao cliente.**

Fonte: "OpenDollars — Investor Research", outubro de 2026 (documento confidencial para investidores, ainda com vários campos em aberto). Resumo para orientar decisões de produto; números e afirmações abaixo não estão aprovados para comunicação ao cliente.

## Tese

- **Lacuna de patrimônio.** De 2010 a 2025, ações da América Latina ficaram praticamente estáveis em USD (~1,1x), enquanto ações globais cresceram ~4x (MSCI). O poupador não busca a melhor cotação do dia, e sim onde a poupança rende por décadas.
- **Mercado mal atendido.** Pessoas físicas no Brasil têm R$9,1 tri em investimentos, mas só ~0,5–1% tem exposição internacional. Argentinos guardam mais de US$200 bi fora do sistema bancário. As alternativas hoje são dólar físico parado, produtos locais com acesso limitado aos EUA ou contas offshore feitas para ricos.
- **Por que agora.** Argentina retirou o limite de compra de dólar por pessoa física (abril de 2025). Brasil tributa investimento no exterior a 15% ao ano desde 2024, mais simples de declarar. Pix Automático (junho de 2025) torna aportes mensais quase sem atrito. Nomad (3,8 mi de usuários) prova a demanda.
- **A estrutura é o fosso.** KYC no app, parceiro licenciado em cada país e conta nos EUA no nome do cliente. Montar licenças, parceiros e integração com custodiante em duas jurisdições é lento e difícil de copiar.
- **Receita recorrente e composta.** Duas fontes principais: spread de câmbio em cada aporte e taxa anual sobre ativos sob administração (AUA). Com aportes recorrentes, a receita cresce com a idade da conta. Cartão (interchange) e assinatura premium são complementares.

## Público

- Poupadores de classe média no Brasil e na Argentina que querem guardar em dólar no longo prazo, sem perfil de trader e sem patrimônio de private banking.
- Concorrência mapeada: corretoras locais (XP, BTG), contas em dólar (Nomad, Avenue), corretoras globais (IBKR direto), apps de remessa (Wise) e private banks. O posicionamento é ser o único focado em aporte recorrente de longo prazo para a classe média, em conta no nome do cliente.

## Roadmap (datas ainda em aberto no documento)

1. Empresa constituída e site bilíngue com lista de espera (outubro de 2026).
2. App com KYC no app e aporte; acordo com parceiro licenciado no Brasil (em negociação); integração com custodiante nos EUA (em andamento).
3. **Piloto na Argentina com as primeiras contas com dinheiro.**
4. Acordo com parceiro licenciado na Argentina.
5. Lançamento público simultâneo no Brasil e na Argentina.
6. Seis meses de dados de aporte recorrente; rodada seed.

Produtos no roadmap, sem data: carteiras com eficiência fiscal (sujeito a registro), relatórios fiscais do país de origem, cartão de débito em USD, carteiras guiadas por consultores sob supervisão dos EUA.

## O que isso muda para o front

- O app do piloto atende só a Argentina (ver `decisions.md`, itens 4 e 5); Brasil, Pix e lançamento simultâneo são roadmap.
- Cartão, relatórios fiscais e carteiras com eficiência fiscal aparecem no máximo como "em breve" (ver `decisions.md`, itens 2 e 3).
- A identidade visual do app segue o `brand-brief.md`, não as cores deste documento (ver `decisions.md`, item 8).
