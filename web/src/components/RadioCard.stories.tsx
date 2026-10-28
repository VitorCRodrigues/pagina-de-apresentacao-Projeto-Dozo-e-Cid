import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { RadioCard, RadioCardGroup } from "./RadioCard";

const meta = preview.meta({ title: "Primitives/RadioCard", component: RadioCard });

function Rails({ value, swiftDisabled = false }: { value?: string; swiftDisabled?: boolean }) {
  return (
    <RadioCardGroup label={i18n.t("demo:radio.label")} {...(value && { defaultValue: value })}>
      <RadioCard
        value="ar_usdc"
        title={i18n.t("demo:radio.usdcTitle")}
        description={i18n.t("demo:radio.usdcBody")}
        recommendation={i18n.t("demo:radio.recommendation")}
      />
      <RadioCard
        value="ar_swift"
        title={i18n.t("demo:radio.swiftTitle")}
        description={i18n.t("demo:radio.swiftBody")}
        disabled={swiftDisabled}
      />
    </RadioCardGroup>
  );
}

export const Unselected = meta.story({ render: () => <Rails /> });

export const Selected = meta.story({ render: () => <Rails value="ar_usdc" /> });

export const WithDisabledOption = meta.story({
  render: () => <Rails value="ar_usdc" swiftDisabled />,
});
