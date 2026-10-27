import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { QrCode } from "./QrCode";

const meta = preview.meta({ title: "Domain/QrCode", component: QrCode });

export const DepositAddress = meta.story({
  render: () => (
    <QrCode value="0x52908400098527886E0F7030069857D2E4169EE7" label={i18n.t("demo:qr.label")} />
  ),
});
