import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Field } from "./Field";
import { Input } from "./Input";

const meta = preview.meta({ title: "Primitives/Input", component: Input });

export const Amount = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.amountLabel")} help={i18n.t("demo:field.amountHelp")}>
      <Input leading="US$" inputMode="decimal" defaultValue="250" />
    </Field>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.amountLabel")} error={i18n.t("demo:field.amountError")}>
      <Input leading="US$" inputMode="decimal" defaultValue="100" />
    </Field>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <Field label={i18n.t("demo:field.amountLabel")}>
      <Input leading="US$" inputMode="decimal" defaultValue="250" disabled />
    </Field>
  ),
});
