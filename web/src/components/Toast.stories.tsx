import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { ToastProvider } from "./Toast";

const meta = preview.meta({ title: "Primitives/Toast", component: ToastProvider });

export const Neutral = meta.story({
  render: () => (
    <ToastProvider
      initial={[{ title: i18n.t("demo:toast.saved"), description: i18n.t("demo:toast.savedBody") }]}
    >
      <div className="min-h-40" />
    </ToastProvider>
  ),
});

export const Error = meta.story({
  render: () => (
    <ToastProvider initial={[{ title: i18n.t("demo:toast.error"), tone: "error" }]}>
      <div className="min-h-40" />
    </ToastProvider>
  ),
});
