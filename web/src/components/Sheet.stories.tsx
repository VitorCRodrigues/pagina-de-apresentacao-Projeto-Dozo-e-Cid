import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

const meta = preview.meta({ title: "Primitives/Sheet", component: Sheet });

export const Open = meta.story({
  render: () => (
    <Sheet
      defaultOpen
      title={i18n.t("demo:sheet.title")}
      description={i18n.t("demo:sheet.body")}
      footer={<Button fullWidth="always">{i18n.t("demo:sheet.action")}</Button>}
    />
  ),
});
