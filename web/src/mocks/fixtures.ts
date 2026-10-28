import type { AppConfig, Locale, Me } from "@/api/types";

// Fictitious people and data. Never real customers.

// Editorial text in the three app languages; picked per Accept-Language at response time.
export type Localized = Record<Locale, string>;

export const config: AppConfig = {
  liveMarkets: ["AR"],
  minRecurringUsdCents: 25000,
  // TODO(decisão): one-off minimum still "a confirmar" in the PRD; mock value in docs/api-gaps.md.
  minDepositUsdCents: 10000,
  efxCapUsdCents: 1000000,
  railsByCountry: { AR: ["ar_usdc", "ar_swift"], BR: ["br_efx", "br_fxbank"] },
  investmentWindowDay: 5,
  ibkrPortalUrl: "https://www.interactivebrokers.com/sso/Login",
};

export const lucia: Me = {
  id: "usr_7f3a9c",
  name: "Lucía Fernández",
  email: "lucia.fernandez@example.com",
  country: "AR",
  locale: "es",
  accountStatus: "open",
};

// Onboarding answers for Lucía. CUIL 27-30123456-8 has a valid check digit.
export const luciaPersonal = {
  fullName: "Lucía Fernández",
  birthDate: "1987-04-12",
  dni: "30123456",
  cuil: "27301234568",
  email: "lucia.fernandez@example.com",
  phone: "+54 9 11 5555-0142",
};

// Lives in a country outside liveMarkets.
export const rafael: Me = {
  id: "usr_2b81d4",
  name: "Rafael Souza",
  email: "rafael.souza@example.com",
  country: "BR",
  locale: "pt",
  accountStatus: "draft",
};

// UCITS, Irish-domiciled, accumulating, in USD (PRD section 2).
export const etfs = [
  {
    isin: "IE00B5BMR087",
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    shares: 14,
    priceCents: 64210,
    targetWeight: 0.6,
    description: {
      es: "Sigue al S&P 500: las 500 mayores empresas de EE. UU. Reinvierte los dividendos.",
      pt: "Acompanha o S&P 500: as 500 maiores empresas dos EUA. Reinveste os dividendos.",
      en: "Tracks the S&P 500, the 500 largest US companies. Reinvests dividends.",
    },
  },
  {
    isin: "IE00BK5BQT80",
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    shares: 39,
    priceCents: 13895,
    targetWeight: 0.3,
    description: {
      es: "Miles de empresas de mercados desarrollados y emergentes. Reinvierte los dividendos.",
      pt: "Milhares de empresas de mercados desenvolvidos e emergentes. Reinveste os dividendos.",
      en: "Thousands of companies across developed and emerging markets. Reinvests dividends.",
    },
  },
  {
    isin: "IE00B4L5Y983",
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    shares: 15,
    priceCents: 10822,
    targetWeight: 0.1,
    description: {
      es: "Grandes y medianas empresas de 23 países desarrollados. Reinvierte los dividendos.",
      pt: "Empresas grandes e médias de 23 países desenvolvidos. Reinveste os dividendos.",
      en: "Large and mid-size companies in 23 developed countries. Reinvests dividends.",
    },
  },
] as const satisfies readonly {
  isin: string;
  name: string;
  shares: number;
  priceCents: number;
  targetWeight: number;
  description: Localized;
}[];

export const documentRequests = [
  {
    id: "pend-address-proof",
    title: {
      es: "Comprobante de domicilio",
      pt: "Comprovante de endereço",
      en: "Proof of address",
    },
    description: {
      es: "Interactive Brokers pide una factura de servicios de los últimos 3 meses.",
      pt: "A Interactive Brokers pede uma conta de consumo dos últimos 3 meses.",
      en: "Interactive Brokers asks for a utility bill from the last 3 months.",
    },
  },
  {
    id: "pend-dni-back",
    title: {
      es: "Foto del dorso del DNI",
      pt: "Foto do verso do DNI",
      en: "Photo of the back of your DNI",
    },
    description: {
      es: "La foto anterior no se leía bien. Sacala con buena luz y sin reflejos.",
      pt: "A foto anterior estava ilegível. Tire com boa luz e sem reflexos.",
      en: "The previous photo was not readable. Take it in good light, without glare.",
    },
  },
] as const satisfies readonly { id: string; title: Localized; description: Localized }[];

export const depositAction = {
  title: {
    es: "Enviá el dinero de tu aporte",
    pt: "Envie o dinheiro do seu aporte",
    en: "Send the money for your deposit",
  },
  description: {
    es: "Seguí las instrucciones de depósito para completar el aporte.",
    pt: "Siga as instruções de depósito para concluir o aporte.",
    en: "Follow the deposit instructions to complete it.",
  },
} as const satisfies { title: Localized; description: Localized };

export const windowNotice = {
  title: {
    es: "Próxima ventana de inversión",
    pt: "Próxima janela de investimento",
    en: "Next investment window",
  },
  description: {
    es: "El dinero en caja se invierte el 5 de noviembre.",
    pt: "O dinheiro em caixa é investido em 5 de novembro.",
    en: "Cash in your account is invested on November 5.",
  },
} as const satisfies { title: Localized; description: Localized };

export const returnReasons = {
  thirdParty: {
    es: "La transferencia salió de una cuenta que no está a tu nombre. El agente de cambio autorizado devuelve el dinero a la cuenta de origen.",
    pt: "A transferência saiu de uma conta que não está no seu nome. O parceiro de câmbio devolve o dinheiro à conta de origem.",
    en: "The transfer came from an account that is not in your name. The exchange partner returns the money to the source account.",
  },
} as const satisfies Record<string, Localized>;

const option = (value: string, es: string, pt: string, en: string) => ({
  value,
  label: { es, pt, en },
});

// Suitability questions (PRD T2). TODO(compliance): wording owned by legal; served by the API.
export const questionnaire = {
  version: "2026-10",
  questions: [
    {
      id: "goal",
      kind: "single" as const,
      label: {
        es: "¿Para qué vas a usar este dinero?",
        pt: "Para que você vai usar este dinheiro?",
        en: "What is this money for?",
      },
      options: [
        option("retirement", "Jubilación", "Aposentadoria", "Retirement"),
        option("savings", "Ahorro de largo plazo", "Poupança de longo prazo", "Long-term savings"),
        option(
          "education",
          "Educación de mis hijos",
          "Educação dos filhos",
          "Children's education",
        ),
      ],
    },
    {
      id: "horizon",
      kind: "single" as const,
      label: {
        es: "¿En cuánto tiempo pensás usarlo?",
        pt: "Em quanto tempo pretende usar?",
        en: "When do you plan to use it?",
      },
      options: [
        option("lt5", "En menos de 5 años", "Em menos de 5 anos", "In less than 5 years"),
        option("5to10", "Entre 5 y 10 años", "Entre 5 e 10 anos", "In 5 to 10 years"),
        option("gt10", "En más de 10 años", "Em mais de 10 anos", "In more than 10 years"),
      ],
    },
    {
      id: "income",
      kind: "number" as const,
      label: {
        es: "Ingreso mensual aproximado, en USD",
        pt: "Renda mensal aproximada, em USD",
        en: "Approximate monthly income, in USD",
      },
    },
    {
      id: "netWorth",
      kind: "number" as const,
      label: {
        es: "Patrimonio aproximado, en USD",
        pt: "Patrimônio aproximado, em USD",
        en: "Approximate net worth, in USD",
      },
    },
    {
      id: "experience",
      kind: "multi" as const,
      label: {
        es: "¿En qué invertiste antes?",
        pt: "Em que você já investiu?",
        en: "What have you invested in before?",
      },
      options: [
        option("deposits", "Plazo fijo", "Renda fixa", "Fixed deposits"),
        option("funds", "Fondos comunes", "Fundos de investimento", "Mutual funds"),
        option("stocks", "Acciones", "Ações", "Stocks"),
        option("none", "Nunca invertí", "Nunca investi", "I have never invested"),
      ],
    },
    {
      id: "risk",
      kind: "single" as const,
      label: {
        es: "Si tu inversión baja 20% en un año, ¿qué hacés?",
        pt: "Se seu investimento cair 20% em um ano, o que você faz?",
        en: "If your investment falls 20% in a year, what do you do?",
      },
      options: [
        option("sell", "Vendo todo", "Vendo tudo", "Sell everything"),
        option("hold", "Espero", "Espero", "Wait"),
        option("add", "Sigo aportando", "Continuo aportando", "Keep depositing"),
      ],
    },
  ],
};

export const termsDocuments = [
  {
    id: "terms-advisory",
    kind: "advisory_agreement" as const,
    title: { es: "Contrato de asesoría", pt: "Contrato de consultoria", en: "Advisory agreement" },
  },
  {
    id: "terms-costs",
    kind: "cost_disclosure" as const,
    title: { es: "Divulgación de costos", pt: "Divulgação de custos", en: "Cost disclosure" },
  },
  {
    id: "terms-privacy",
    kind: "privacy_policy" as const,
    title: { es: "Política de privacidad", pt: "Política de privacidade", en: "Privacy policy" },
  },
  {
    id: "terms-ibkr-consent",
    kind: "ibkr_data_consent" as const,
    title: {
      es: "Consentimiento para enviar tus datos a Interactive Brokers",
      pt: "Consentimento para enviar seus dados à Interactive Brokers",
      en: "Consent to send your data to Interactive Brokers",
    },
  },
];
