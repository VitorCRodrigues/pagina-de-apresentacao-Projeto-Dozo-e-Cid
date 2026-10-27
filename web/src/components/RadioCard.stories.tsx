import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { Badge } from "./Badge";
import { RadioCard, RadioCardGroup } from "./RadioCard";

const meta = preview.meta({ title: "Primitives/RadioCard", component: RadioCard });

function Rails({ value, swiftDisabled = false }: { value?: string; swiftDisabled?: boolean }) {
  return (
    <RadioCardGroup label={i18n.t("demo:radio.label")} {...(value && { defaultValue: value })}>
      <RadioCard
        value="ar_usdc"
        title={i18n.t("demo:radio.usdcTitle")}
        description={i18n.t("demo:radio.usdcBody")}
        aside={<Badge tone="success">{i18n.t("demo:radio.recommended")}</Badge>}
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
