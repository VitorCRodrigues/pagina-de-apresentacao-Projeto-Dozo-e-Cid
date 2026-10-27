import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Checkbox } from "./Checkbox";

const meta = preview.meta({ title: "Primitives/Checkbox", component: Checkbox });

function TermsLink() {
  return (
    <a href="#terms" className="text-green-700 underline underline-offset-4">
      {i18n.t("demo:checkbox.termsLink")}
    </a>
  );
}

export const Unchecked = meta.story({
  render: () => <Checkbox label={i18n.t("demo:checkbox.terms")} description={<TermsLink />} />,
});

export const Checked = meta.story({
  render: () => (
    <Checkbox label={i18n.t("demo:checkbox.terms")} description={<TermsLink />} defaultChecked />
  ),
});

export const Disabled = meta.story({
  render: () => <Checkbox label={i18n.t("demo:checkbox.consent")} disabled />,
});
