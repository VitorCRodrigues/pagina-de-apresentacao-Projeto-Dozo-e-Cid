import "i18next";
import type demo from "./demo/es.json";
import type account from "./locales/es/account.json";
import type deposit from "./locales/es/deposit.json";
import type onboarding from "./locales/es/onboarding.json";
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
      demo: typeof demo;
    };
  }
}
