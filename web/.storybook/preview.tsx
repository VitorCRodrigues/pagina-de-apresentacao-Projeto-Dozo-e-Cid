import { definePreview } from "@storybook/react-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import { setupWorker } from "msw/browser";
import addonMsw from "msw-storybook-addon";
import { createQueryClient } from "@/api/queryClient";
import i18n, { defaultLocale, supportedLocales } from "@/i18n";
import { loadDemoResources } from "@/i18n/demo";
import { handlers } from "@/mocks/handlers";
import { storyLocale } from "./locale";
import "@/styles/index.css";

loadDemoResources(i18n);

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
  parameters: { layout: "fullscreen" },
  // Switch language before render, so stories can call i18n.t directly.
  loaders: [
    async ({ globals }) => {
      await i18n.changeLanguage(storyLocale(globals));
    },
  ],
  decorators: [
    (Story, { parameters }) => (
      <QueryClientProvider client={createQueryClient()}>
        {parameters.frame === false ? (
          <Story />
        ) : (
          // The 375 px reference width from web/CLAUDE.md.
          <div className="w-[375px] px-5 py-6">
            <Story />
          </div>
        )}
      </QueryClientProvider>
    ),
  ],
});
