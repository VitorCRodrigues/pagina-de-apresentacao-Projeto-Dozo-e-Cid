import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  DepositDetail,
  ScopedUsdcInstructions,
  ScopedWireInstructions,
} from "@/api/proposed-types";
import { UsdcInstructions } from "./UsdcInstructions";
import { WireInstructions } from "./WireInstructions";

// Spy on the QR encoder: the code must hold the bare address and nothing else.
const encode = vi.hoisted(() => vi.fn<typeof import("uqr").encode>());
vi.mock("uqr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("uqr")>();
  encode.mockImplementation(actual.encode);
  return { ...actual, encode };
});

const address = "0x52908400098527886E0F7030069857D2E4169EE7";

const usdc: ScopedUsdcInstructions = {
  type: "usdc",
  token: "USDC",
  network: "Ethereum (ERC-20)",
  address,
  memo: "4821",
  scope: "account",
};

const wire: ScopedWireInstructions = {
  type: "wire",
  beneficiaryName: "Lucía Fernández",
  accountNumber: "U****4821",
  bankName: "Citibank N.A., New York",
  swiftBic: "CITIUS33",
  reference: "OD-DEP-1",
  scope: "deposit",
};

const deposit = (extra: Partial<DepositDetail> = {}): DepositDetail => ({
  id: "dep-1",
  rail: "ar_usdc",
  state: "deposit_notified",
  amountCents: 50000,
  costs: [],
  history: [{ state: "deposit_notified", at: "2026-10-31T12:00:00Z" }],
  createdAt: "2026-10-31T12:00:00Z",
  isFirstDeposit: false,
  ...extra,
});

describe("USDC instructions", () => {
  it("encodes only the address in the QR: no URI prefix, no memo", () => {
    render(<UsdcInstructions deposit={deposit()} instructions={usdc} />);
    expect(
      screen.getByRole("img", { name: "Código QR de la dirección de depósito" }),
    ).toBeInTheDocument();
    expect(encode.mock.calls.map((call) => call[0])).toEqual([address]);
  });

  it("gives the memo its own copy field, outside the QR", () => {
    render(<UsdcInstructions deposit={deposit()} instructions={usdc} />);
    expect(screen.getByText("Memo")).toBeInTheDocument();
    expect(screen.getByText("4821")).toBeInTheDocument();
  });

  it("locks the token and network the API sent", () => {
    render(<UsdcInstructions deposit={deposit()} instructions={usdc} />);
    expect(screen.getByText("USDC · red Ethereum (ERC-20)")).toBeInTheDocument();
    expect(screen.getByText(/Enviá solamente USDC en esta red/)).toBeInTheDocument();
    expect(screen.getByText(/¿Tenés USDT\? Convertilo a USDC/)).toBeInTheDocument();
  });

  it("shows the exact amount to send, ready to copy, with the delay warning", () => {
    render(<UsdcInstructions deposit={deposit()} instructions={usdc} />);
    expect(screen.getByText("Valor exacto a enviar")).toBeInTheDocument();
    expect(screen.getByText("500.00")).toBeInTheDocument();
    expect(screen.getByText(/Un valor distinto puede demorar tu aporte/)).toBeInTheDocument();
  });

  it("suggests a small test send on the first deposit only", () => {
    const { rerender } = render(<UsdcInstructions deposit={deposit()} instructions={usdc} />);
    expect(screen.queryByText(/monto chico de prueba/)).toBeNull();
    rerender(<UsdcInstructions deposit={deposit({ isFirstDeposit: true })} instructions={usdc} />);
    expect(screen.getByText(/monto chico de prueba/)).toBeInTheDocument();
  });
});

describe("SWIFT instructions", () => {
  it("lists every bank field to copy and marks the reference as required", () => {
    render(<WireInstructions deposit={deposit({ rail: "ar_swift" })} instructions={wire} />);
    for (const value of [
      "Lucía Fernández",
      "U****4821",
      "Citibank N.A., New York",
      "CITIUS33",
      "OD-DEP-1",
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(/^Obligatoria\./)).toBeInTheDocument();
    expect(screen.getByText(/tiene que salir de una cuenta a tu nombre/)).toBeInTheDocument();
    expect(screen.getByText(/Tu banco puede cobrar sus propias comisiones/)).toBeInTheDocument();
    expect(screen.getByText("500.00")).toBeInTheDocument();
  });
});
