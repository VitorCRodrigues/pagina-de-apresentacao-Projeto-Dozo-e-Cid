// Generates docs/copy-review.md and docs/copy-review.csv for the legal review, from the locale
// files and the editorial texts the mock API serves. Run with: npm run copy:review
// Node strips the types of fixtures.ts by itself (Node 22.18 or later).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as fixtures from "../src/mocks/fixtures.ts";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(web, "src/i18n/locales");

const RIA_STATUS = "pendente: depende da confirmação do registro RIA antes do piloto";
const PENDING = "pendente";

// Item 6: texts that presume OpenDollars' status as a registered adviser.
const riaKeys = {
  "custody.note": "Afirma que a OpenDollars é a assessora de investimentos do cliente.",
  "help.questions.custody.a": "Afirma que a OpenDollars é a assessora de investimentos do cliente.",
  "profile.suitability.intro": 'Fala em "tu asesor" revisando as respostas.',
  "onboarding.suitability.lead": "Promete uma recomendação adequada ao cliente.",
  "costs.kind.advisory_fee": "Nomeia honorários de assessoria.",
  "mock:terms.terms-advisory": "Título do contrato de assessoria (vem da API).",
  "mock:termsUpdate.title": "Título da nova versão do contrato de assessoria (vem da API).",
};

// TODO(compliance) in the code, by key prefix, with what the reviewer should look at.
const complianceRules = [
  ["errors.", "Mensagens de erro: src/api/error-messages.ts."],
  ["blockReason.", "Bloqueios: não revelar o motivo de compliance (PRD, seção 5)."],
  ["risk.default", "Aviso de risco obrigatório em Carteira e Plano (PRD, seção 10)."],
  ["deposit.detail.refund", "A política de devolução depende do contrato com o parceiro."],
  ["deposit.detail.returned", "A política de devolução depende do contrato com o parceiro."],
  ["deposit.instructions.exactAmountNote", "Consequências de enviar um valor diferente."],
  ["deposit.instructions.usdc.warning", "Risco de perda por rede errada (PRD, seção 5)."],
  ["help.questions.", "FAQ: sem promessa de rentabilidade, legalidade ou proteção fiscal."],
  ["onboarding.funds.", "Origem dos recursos e pessoa exposta: redação e listas."],
  ["onboarding.terms.ibkrConsent", "Cita a Lei 25.326 e o envio de dados aos Estados Unidos."],
  ["onboarding.terms.", "Textos dos termos ainda em rascunho."],
  ["pending.terms.", "Aceite de novos termos: textos ainda em rascunho."],
  ["portfolio.asOf", "Explicação da atualização diária."],
  ["entry.", "Título e piloto fechado na tela de entrada."],
  ["mock:returnReasons.", "Motivo de devolução: vem da API; parceiro em termo genérico."],
  ["mock:questionnaire.", "Questionário de perfil: redação de responsabilidade do jurídico."],
  ["mock:terms.", "Títulos dos documentos: vêm da API."],
];

// Where each key appears, by the longest matching prefix.
const screens = [
  ["account.", "T3 Status da conta"],
  ["deposit.home.", "T6 Aportar"],
  ["deposit.steps.", "T6 Novo aporte"],
  ["deposit.amount.", "T6 Novo aporte"],
  ["deposit.rail.", "T6 Novo aporte"],
  ["deposit.preview.", "T6 Novo aporte"],
  ["deposit.actions.", "T6 a T8 Aporte"],
  ["deposit.title", "T6 Aportar"],
  ["deposit.state.", "T4, T8, T10 Estados do aporte"],
  ["deposit.detail.", "T8 Detalhe do aporte"],
  ["deposit.instructions.", "T7 Instruções de depósito"],
  ["deposit.history.", "T10 Histórico"],
  ["onboarding.", "T2 Onboarding"],
  ["pending.", "T11 Pendências"],
  ["plan.", "T5 Plano mensal"],
  ["home.", "T4 Início"],
  ["portfolio.", "T4, T9 Carteira"],
  ["profile.suitability.", "T12 Perfil de investidor"],
  ["profile.", "T12 Perfil"],
  ["help.", "T13 Ajuda"],
  ["entry.", "T1 Entrada"],
  ["waitlist.", "T1, T2 Lista de espera"],
  ["session.", "Sessão, aviso de inatividade"],
  ["states.", "Estados comuns (erro, sessão, manutenção)"],
  ["errors.", "Mensagens de erro, todas as telas"],
  ["blockReason.", "T6 e T4, bloqueios de aporte"],
  ["custody.", "T2, T3 Custódia"],
  ["costs.", "T5, T6, T8 Tabela de custos"],
  ["risk.", "T5, T9 Aviso de risco"],
  ["nav.", "Navegação"],
  ["shell.", "Navegação"],
  ["notFound.", "Página não encontrada"],
  ["mock:etfs.", "T9 Carteira (vem da API)"],
  ["mock:documentRequests.", "T3, T11 Documentos pedidos (vem da API)"],
  ["mock:depositAction.", "T11 Pendências (vem da API)"],
  ["mock:windowNotice.", "T11 Pendências (vem da API)"],
  ["mock:planReminder.", "T11 Pendências (vem da API)"],
  ["mock:termsUpdate.", "T11 Pendências (vem da API)"],
  ["mock:returnReasons.", "T8 Detalhe do aporte (vem da API)"],
  ["mock:questionnaire.", "T2, T12 Perfil de investidor (vem da API)"],
  ["mock:terms.", "T2, T11, T12 Termos (vem da API)"],
];

const screenOf = (key) => {
  const match = screens
    .filter(([prefix]) => key.startsWith(prefix))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match ? match[1] : "Componentes comuns";
};

function flatten(value, prefix = "") {
  if (typeof value !== "object" || value === null) return { [prefix]: String(value) };
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key)),
    ),
  );
}

const read = (lang, file) =>
  flatten(JSON.parse(readFileSync(join(localesDir, lang, file), "utf8")));

const rows = [];
function add(key, es, pt, en) {
  rows.push({ key, screen: screenOf(key), es, pt, en });
}

// dev.* is the mock's scenario switcher: the client never sees it.
for (const file of readdirSync(join(localesDir, "es")).sort()) {
  const [es, pt, en] = ["es", "pt", "en"].map((lang) => read(lang, file));
  for (const key of Object.keys(es)) {
    if (!key.startsWith("dev.")) add(key, es[key], pt[key], en[key]);
  }
}

const addLocalized = (key, text) => add(key, text.es, text.pt, text.en);
for (const etf of fixtures.etfs) addLocalized(`mock:etfs.${etf.isin}.description`, etf.description);
for (const doc of fixtures.documentRequests) {
  addLocalized(`mock:documentRequests.${doc.id}.title`, doc.title);
  addLocalized(`mock:documentRequests.${doc.id}.description`, doc.description);
}
for (const name of ["depositAction", "windowNotice", "planReminder", "termsUpdate"]) {
  addLocalized(`mock:${name}.title`, fixtures[name].title);
  addLocalized(`mock:${name}.description`, fixtures[name].description);
}
for (const [id, text] of Object.entries(fixtures.returnReasons)) {
  addLocalized(`mock:returnReasons.${id}`, text);
}
for (const question of fixtures.questionnaire.questions) {
  addLocalized(`mock:questionnaire.${question.id}`, question.label);
  for (const option of question.options) {
    addLocalized(`mock:questionnaire.${question.id}.${option.value}`, option.label);
  }
}
for (const doc of fixtures.termsDocuments) addLocalized(`mock:terms.${doc.id}`, doc.title);

const complianceNote = (key) => complianceRules.find(([prefix]) => key.startsWith(prefix))?.[1];

const ria = [];
const compliance = [];
const others = [];
for (const row of rows) {
  if (riaKeys[row.key]) {
    ria.push({ ...row, section: "1. Registro RIA", status: RIA_STATUS, note: riaKeys[row.key] });
  } else if (complianceNote(row.key)) {
    compliance.push({
      ...row,
      section: "2. TODO(compliance)",
      status: PENDING,
      note: complianceNote(row.key),
    });
  } else {
    others.push({ ...row, section: "3. Demais textos", status: PENDING, note: "" });
  }
}

const cell = (text) => String(text).replaceAll("|", "\\|").replaceAll("\n", " ");
const table = (list) =>
  [
    "| Chave | Tela | ES | PT | EN | Status jurídico | Observação |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...list.map(
      (r) =>
        `| \`${cell(r.key)}\` | ${[r.screen, r.es, r.pt, r.en, r.status, r.note].map(cell).join(" | ")} |`,
    ),
  ].join("\n");

const markdown = `# Revisão jurídica dos textos

Gerado por \`npm run copy:review\` a partir de \`src/i18n/locales\` e dos textos editoriais do mock (\`src/mocks/fixtures.ts\`). Não edite à mão: comente em \`copy-review.csv\`, que tem o mesmo conteúdo, e os ajustes voltam para os arquivos de idioma.

Total: ${rows.length} textos. Chaves \`mock:\` são exemplos do que a API vai servir; o texto final vem do backend. Ficam de fora os nomes das províncias argentinas (nomes próprios) e o seletor de cenários do mock, que o cliente não vê. \`{{min}}\`, \`{{date}}\` e semelhantes são valores preenchidos pelo app.

## 1. Depende da confirmação do registro RIA antes do piloto

Nenhum texto do app diz "registrada" nem cita a SEC. Estes ${ria.length} pressupõem o status de assessora de investimentos e dependem dessa confirmação.

${table(ria)}

## 2. Marcados com TODO(compliance) no código

${compliance.length} textos.

${table(compliance)}

## 3. Demais textos

${others.length} textos.

${table(others)}
`;

const csvCell = (text) => `"${String(text).replaceAll('"', '""')}"`;
const header = ["Seção", "Chave", "Tela", "ES", "PT", "EN", "Status jurídico", "Observação"];
const csv = [
  header.map(csvCell).join(","),
  ...[...ria, ...compliance, ...others].map((r) =>
    [r.section, r.key, r.screen, r.es, r.pt, r.en, r.status, r.note].map(csvCell).join(","),
  ),
].join("\r\n");

writeFileSync(join(web, "docs/copy-review.md"), markdown);
// With a BOM, so spreadsheets read the accents as UTF-8.
writeFileSync(join(web, "docs/copy-review.csv"), `\uFEFF${csv}\r\n`);
console.log(
  `copy-review: ${String(rows.length)} texts (${String(ria.length)} RIA, ${String(compliance.length)} compliance)`,
);
