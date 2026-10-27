import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Button } from "./Button";

const meta = preview.meta({ title: "Primitives/Button", component: Button });

export const Primary = meta.story({
  render: () => <Button variant="primary">{i18n.t("demo:button.primary")}</Button>,
});

export const Secondary = meta.story({
  render: () => <Button variant="secondary">{i18n.t("demo:button.secondary")}</Button>,
});

export const Ghost = meta.story({
  render: () => <Button variant="ghost">{i18n.t("demo:button.ghost")}</Button>,
});

export const Destructive = meta.story({
  render: () => <Button variant="destructive">{i18n.t("demo:button.destructive")}</Button>,
});

export const Loading = meta.story({
  render: () => <Button loading>{i18n.t("demo:button.loading")}</Button>,
});

export const Disabled = meta.story({
  render: () => <Button disabled>{i18n.t("demo:button.primary")}</Button>,
});

export const GhostDisabled = meta.story({
  render: () => (
    <Button variant="ghost" disabled>
      {i18n.t("demo:button.ghost")}
    </Button>
  ),
});

export const AutoWidth = meta.story({
  render: () => <Button fullWidth="never">{i18n.t("demo:button.primary")}</Button>,
});
