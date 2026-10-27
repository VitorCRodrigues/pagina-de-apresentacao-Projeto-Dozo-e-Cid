import type { CostLine } from "@/api/types";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { CostTable } from "./CostTable";

const meta = preview.meta({ title: "Domain/CostTable" });

// Labels are rendered from i18n by kind; the API label is not shown.
const usdcLines: CostLine[] = [
  { kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false },
  { kind: "allocation_min", label: "", amountCents: 0, percent: 0, estimated: false },
  { kind: "advisory_fee", label: "", amountCents: 250, percent: 0.005, estimated: true },
];

const swiftLines: CostLine[] = [
  { kind: "fx_spread", label: "", amountCents: 0, percent: 0, estimated: false },
  { kind: "rail_fee", label: "", amountCents: 3500, percent: 0.07, estimated: true },
  { kind: "advisory_fee", label: "", amountCents: 250, percent: 0.005, estimated: true },
];

export const Usdc = meta.story({
  render: (_args, { globals }) => (
    <CostTable
      lines={usdcLines}
      amountCents={50000}
      totalCostCents={400}
      netToInvestCents={49600}
      locale={storyLocale(globals)}
    />
  ),
});

export const SwiftWithHighFixedFee = meta.story({
  render: (_args, { globals }) => (
    <CostTable
      lines={swiftLines}
      amountCents={50000}
      totalCostCents={3750}
      netToInvestCents={46250}
      locale={storyLocale(globals)}
    />
  ),
});
