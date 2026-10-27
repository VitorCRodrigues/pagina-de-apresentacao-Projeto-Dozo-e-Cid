import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Badge } from "./Badge";

const meta = preview.meta({ title: "Primitives/Badge", component: Badge });

export const Neutral = meta.story({
  render: () => <Badge tone="neutral">{i18n.t("demo:badge.neutral")}</Badge>,
});

export const Info = meta.story({
  render: () => <Badge tone="info">{i18n.t("demo:badge.info")}</Badge>,
});

export const Success = meta.story({
  render: () => <Badge tone="success">{i18n.t("demo:badge.success")}</Badge>,
});

export const Warning = meta.story({
  render: () => <Badge tone="warning">{i18n.t("demo:badge.warning")}</Badge>,
});

export const Error = meta.story({
  render: () => <Badge tone="error">{i18n.t("demo:badge.error")}</Badge>,
});
