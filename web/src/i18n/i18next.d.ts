import "i18next";
import type demo from "./demo/es.json";
import type account from "./locales/es/account.json";
import type deposit from "./locales/es/deposit.json";
import type onboarding from "./locales/es/onboarding.json";
import type pending from "./locales/es/pending.json";
import type plan from "./locales/es/plan.json";
import type portfolio from "./locales/es/portfolio.json";
import type profile from "./locales/es/profile.json";
import type translation from "./locales/es/translation.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    fallbackNS: "translation";
    // "demo" holds Storybook sample copy; it is only loaded by .storybook/preview.tsx.
    resources: {
      translation: typeof translation;
      onboarding: typeof onboarding;
      account: typeof account;
      deposit: typeof deposit;
      portfolio: typeof portfolio;
      plan: typeof plan;
      pending: typeof pending;
      profile: typeof profile;
      demo: typeof demo;
    };
  }
}
