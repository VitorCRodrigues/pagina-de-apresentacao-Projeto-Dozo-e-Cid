import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Field } from "./Field";
import { Select } from "./Select";

const meta = preview.meta({ title: "Primitives/Select", component: Select });

function dayOptions() {
  return [1, 5, 10, 15].map((day) => ({
    value: String(day),
    label: i18n.t("demo:select.day", { day }),
  }));
}

export const Placeholder = meta.story({
  render: () => (
    <Field label={i18n.t("demo:select.label")}>
      <Select options={dayOptions()} />
    </Field>
  ),
});

export const Selected = meta.story({
  render: () => (
    <Field label={i18n.t("demo:select.label")}>
      <Select options={dayOptions()} defaultValue="5" />
    </Field>
  ),
});

// A native select: the open list is the browser's own, so the story shows the error instead.
export const Invalid = meta.story({
  render: () => (
    <Field label={i18n.t("demo:select.label")} error={i18n.t("demo:select.error")}>
      <Select options={dayOptions()} />
    </Field>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <Field label={i18n.t("demo:select.label")}>
      <Select options={dayOptions()} defaultValue="5" disabled />
    </Field>
  ),
});
