import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Field } from "./Field";
import { Input } from "./Input";

const meta = preview.meta({ title: "Primitives/Field", component: Field });

export const Default = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.cuitLabel")}>
      <Input inputMode="numeric" autoComplete="off" />
    </Field>
  ),
});

export const WithHelp = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.cuitLabel")} help={i18n.t("demo:field.cuitHelp")}>
      <Input inputMode="numeric" defaultValue="20123456789" />
    </Field>
  ),
});

export const WithError = meta.story({
  render: () => (
    <Field
      label={i18n.t("demo:field.cuitLabel")}
      help={i18n.t("demo:field.cuitHelp")}
      error={i18n.t("demo:field.cuitError")}
    >
      <Input inputMode="numeric" defaultValue="20123456780" />
    </Field>
  ),
});

export const Optional = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.phoneLabel")} optional>
      <Input type="tel" autoComplete="tel" />
    </Field>
  ),
});
