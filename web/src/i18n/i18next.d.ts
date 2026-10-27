import "i18next";
import type demo from "./demo/es.json";
import type es from "./es.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    // "demo" holds Storybook sample copy; it is only loaded by .storybook/preview.tsx.
    resources: { translation: typeof es; demo: typeof demo };
  }
}
