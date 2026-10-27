import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { CopyField } from "./CopyField";

const meta = preview.meta({ title: "Domain/CopyField", component: CopyField });

const sampleAddress = "0x52908400098527886E0F7030069857D2E4169EE7";

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

export const Address = meta.story({
  render: () => <CopyField label={i18n.t("demo:copy.addressLabel")} value={sampleAddress} />,
});

export const Reference = meta.story({
  render: () => <CopyField label={i18n.t("demo:copy.referenceLabel")} value="OD-7Q4K-2291" />,
});

export const Copied = meta.story({
  beforeEach: () => {
    stubClipboard(() => Promise.resolve());
  },
  render: () => <CopyField label={i18n.t("demo:copy.addressLabel")} value={sampleAddress} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
  },
});

export const CopyFailed = meta.story({
  beforeEach: () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
  },
  render: () => <CopyField label={i18n.t("demo:copy.addressLabel")} value={sampleAddress} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
  },
});
