import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CostTable } from "./CostTable";

describe("CostTable", () => {
  it("lists costs, marks estimates and states what arrives to invest", () => {
    // Labels follow the UI language (es in tests); amounts follow the locale prop.
    render(
      <CostTable
        locale="en"
        amountCents={50000}
        totalCostCents={400}
        netToInvestCents={49600}
        lines={[
          { kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false },
          { kind: "advisory_fee", label: "", amountCents: 250, percent: 0.005, estimated: true },
        ]}
      />,
    );

    expect(screen.getByRole("table", { name: "Costos de este aporte" })).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: /Honorarios de asesoría\s*estimado/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Comisión de la transferencia" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Costo total 0\.8% \$4\.00/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Llega para invertir \$496\.00/ })).toBeInTheDocument();
  });
});
