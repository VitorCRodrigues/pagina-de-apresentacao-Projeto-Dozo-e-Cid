import { definePreview } from "@storybook/react-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import { setupWorker } from "msw/browser";
import addonMsw from "msw-storybook-addon";
import { createQueryClient } from "@/api/queryClient";
import i18n, { defaultLocale, supportedLocales } from "@/i18n";
import { handlers } from "@/mocks/handlers";
import "@/styles/index.css";

export default definePreview({
  addons: [
    addonMsw(async () => {
      const worker = setupWorker(...handlers);
      await worker.start({ quiet: true, onUnhandledFrame: "bypass" });
      return worker;
    }),
  ],
  globalTypes: {
    locale: {
      description: "UI language",
      toolbar: { icon: "globe", items: [...supportedLocales], dynamicTitle: true },
    },
  },
  initialGlobals: { locale: defaultLocale },
  decorators: [
    (Story, { globals }) => {
      const locale = typeof globals.locale === "string" ? globals.locale : defaultLocale;
      if (i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
      return (
        <QueryClientProvider client={createQueryClient()}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
});
