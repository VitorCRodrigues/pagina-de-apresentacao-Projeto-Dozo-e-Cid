# Resumo Executivo — Como o Negócio Funciona

*Documento interno para equipe e investidores. Estágio: estudo de viabilidade. Números do modelo são premissas a serem validadas, não projeções garantidas.*

> **Status notice — 2026-08-14:** This is a legacy thesis summary, not an approved legal or operating design. Do not use it externally until the Stage 0 corrections and launch gates in the [Problem Resolution Roadmap](Problemas%20para%20resolver/README.md) are complete.

---

## 1. O que vendemos

O produto central **não é câmbio**. É **acesso ao mercado americano, em dólar, para quem mora em países onde a moeda e a bolsa local destroem patrimônio.**

Em ordem de importância para a receita:

1. **Conta de investimento em USD com aportes mensais recorrentes** (formato previdência privada) — **o motor do negócio.** Receita recorrente sobre o patrimônio sob gestão, que cresce e se acumula.
2. **Câmbio e remessa internacional** — **o funil de aquisição.** Margem baixa, frequência alta, custo de aquisição barato. Serve para trazer o cliente, não para sustentar a empresa.
3. **Cartão de débito em USD** — uso diário e retenção. Gera receita de interchange.
4. **Consultoria e gestão de carteira** através da nossa RIA (consultoria de investimentos registrada nos EUA).
5. **Relatórios fiscais automáticos** — IRPF (bens no exterior), DCBE, Bienes Personales na Argentina. Custo baixo para nós, alto custo de troca para o cliente.
6. **Alocação com proteção sucessória** — nosso diferencial competitivo real (item 5).

> **A lógica:** o câmbio adquire o cliente barato; o investimento recorrente monetiza. Um cliente que investe vale entre 1,5x e 5,5x um cliente que só faz câmbio.

## 2. Por que o cliente troca de fornecedor

Desde 2008, a bolsa brasileira medida em dólar caiu entre 50% e 70%, enquanto o S&P 500 multiplicou por aproximadamente 4. **É uma diferença de patrimônio de cerca de 10 vezes.**

O cliente não nos procura por uma taxa de câmbio melhor. Procura porque **está perdendo patrimônio onde está.** A taxa é o argumento de entrada; a perda acumulada é a razão real.

## 3. Como o dinheiro se move — um único desenho para todos os países

```
Moeda local  →  PSP local licenciado  →  parceiro de câmbio/VASP local  →  conta do PRÓPRIO cliente
                (recebe Pix, CBU/CVU)     (faz a perna internacional        nos EUA (corretora)
                                           legalmente)                            ↓
                                                                          nossa RIA gerencia
```

Quatro regras que não mudam nunca:

- **A conta é sempre do próprio cliente**, nos EUA, no nome dele. **Nunca juntamos dinheiro de clientes num fundo nosso.** Isso resolve o problema regulatório em todos os países de uma só vez.
- **Nós nunca somos a instituição licenciada no país de origem.** O parceiro local é. Isso mantém nossa estrutura leve.
- **Todo investimento vai para os EUA.** Nunca investimos na América do Sul.
- **Muda apenas o parceiro local e uma regra fiscal por país.** A engenharia é a mesma.

## 4. Como funciona em cada país

| País | Função | Como opera |
|---|---|---|
| **Argentina** | **Melhor mercado (demanda)** | Sem imposto equivalente ao IOF e sem proibição de stablecoin. **Duas rotas legais independentes** (provedor de ativos virtuais registrado na CNV, ou rota tradicional via ALYC). Cliente já usa stablecoin no dia a dia — custo de educação zero. |
| **Brasil** | **Mercado principal, mais difícil** | Exige parceiro licenciado (PSP + instituição de câmbio ou VASP autorizado pelo BCB). Stablecoin só através de VASP licenciado. **IOF de 1,10% na faixa de investimento** contra 3,5% em cartão/espécie. |
| **Uruguai** | **Infraestrutura, não mercado** | Zona franca com tributação corporativa zero, **banco correspondente de verdade**, sem controle de câmbio, encargo trabalhista de ~12–13% (contra ~70–80% no Brasil). Base operacional e de tecnologia. |
| **Paraguai** | **Mercado pequeno, adicional** | Reaproveita a estrutura argentina com custo marginal quase zero. **Nunca usar para banco ou tesouraria** — o risco de reputação prejudica nosso acesso bancário, que é nosso maior risco. |
| **Estados Unidos** | **Destino de todo o dinheiro** | Nossa RIA e a corretora custodiante. É a única licença que possuímos. |

## 5. Como reduzimos custos e impostos — legalmente

**Custos:**
- **Trilhos de stablecoin em vez de bancos correspondentes:** move dinheiro por cerca de 1%, contra 5% a 8% pela via bancária tradicional. É isso que torna o preço possível.
- **Modelo de agente:** usamos as licenças dos parceiros em vez de comprar as nossas. Evita de USD 1 a 3 milhões em licenciamento até o volume justificar.
- **Uma engenharia, vários países.** Custo marginal de abrir o segundo e o terceiro país é próximo de zero.

**Impostos — do lado do cliente:**
- **Faixa correta de IOF:** 1,10% (investimento no exterior) em vez de 3,5% (cartão/espécie) — **porque o cliente efetivamente investe.** A finalidade declarada é real.
- **ETFs domiciliados na Irlanda em vez de ETFs americanos.** Dois efeitos: retenção de dividendos cai de **30% para 15%**, e — mais importante — **elimina o imposto sucessório americano.** Hoje, um cliente brasileiro ou argentino que morre com ativos americanos tem isenção de apenas **USD 60 mil**, com alíquota de até **40%** acima disso, além de 9 a 18 meses de bloqueio do dinheiro para a família. Nenhum país do Cone Sul tem tratado sucessório com os EUA. **Concorrentes que usam apenas corretoras americanas não conseguem oferecer isso.**

**Impostos — do lado da empresa:**
- **Holding em Delaware (EUA).** Três dos quatro sócios são residentes fiscais americanos, o que torna qualquer estrutura offshore tributada de qualquer forma nos EUA. Estruturas na Suíça, Cayman ou Panamá teriam o custo de compliance **sem** o benefício fiscal.
- **QSBS:** possibilidade de excluir de USD 10 a 15 milhões de ganho por sócio na venda — exige empresa americana. Potencialmente o maior valor fiscal do projeto.
- **Crédito de P&D (§41):** até USD 500 mil por ano compensáveis contra folha de pagamento, **mesmo sem lucro** — caixa real durante a fase de investimento.

### ⚠️ O que NÃO fazemos

Isto é uma definição de negócio, não uma formalidade:

- **Não vendemos evasão fiscal.** Vendemos estrutura eficiente e em conformidade: o cliente paga o que deve, e não mais do que deve.
- **Não declaramos finalidade falsa em operação de câmbio.** A faixa de 1,10% vale porque o investimento é real.
- **Não misturamos dinheiro de câmbio com dinheiro de investimento.** São regimes legais distintos.
- **Não oferecemos valores mobiliários publicamente** nos países de origem. Apenas em base privada, com cliente identificado e avaliado.

> Esta disciplina não é conservadorismo: nosso acesso a bancos e parceiros depende dela, e é o nosso maior risco existencial.

## 6. Estrutura e equipe

- **Holding em Delaware** → **RIA nos EUA (Flórida)** + **parceiros licenciados em cada país** + **entidade no Uruguai** (operação, quando justificar) + **VPN como empresa separada.**
- **Equipe atual: 3 pessoas nos EUA, 1 no Brasil.**
- A divisão de trabalho segue **função regulada x não regulada** — não nacionalidade. Duas funções são de pessoa nomeada e obrigatórias: o representante de investimentos registrado (IAR) e o responsável de prevenção à lavagem de dinheiro.
- **A autoridade para assinar contratos permanece nos EUA.** Isso protege a operação no Brasil de constituir atividade regulada local sem autorização.

## 7. Onde estamos, com honestidade

**Modelo base (premissas a validar):** ponto de equilíbrio entre o mês 18 e 20; necessidade máxima de caixa de **USD 320 a 400 mil**; receita no ano 3 de aproximadamente **USD 3,3 milhões**.

**O que ainda não está decidido ou provado:**
- **Custo de aquisição de cliente (CAC)** é a premissa que sustenta todo o modelo e ainda não foi medida em operação real. É o objetivo da fase piloto.
- **Mercado inicial: Argentina ou Brasil.** Argentina é mais barata e mais fácil; Brasil é maior e é onde temos presença.
- **Folha de pagamento x caixa:** três pessoas nos EUA a salário de mercado não cabem no orçamento de USD 320 a 400 mil. Ou a remuneração é de fundador, ou o orçamento sobe.
- **Não temos vantagem tecnológica.** A diferenciação vem de proteção sucessória, relatórios fiscais, foco em previdência e canal via empregadores — não de tecnologia.

**Itens que exigem advogado antes de operar:** enquadramento da operação de câmbio no Brasil, disponibilidade de fração de cota nos ETFs irlandeses, confirmação da estrutura societária americana e status de autorização de trabalho da equipe nos EUA.
