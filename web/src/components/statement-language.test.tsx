import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Card } from "./Card";
import { CopyField } from "./CopyField";
import { Countdown } from "./Countdown";
import { Input } from "./Input";
import { Ledger, LedgerRow } from "./Ledger";
import { EmptyState, ErrorState } from "./PageState";
import { RadioCard, RadioCardGroup } from "./RadioCard";
import { RiskNote } from "./RiskNote";
import { Skeleton } from "./Skeleton";
import { Stepper } from "./Stepper";
import { Wordmark } from "./Wordmark";

// The statement language: notes with a side rule instead of tinted boxes, status as text with a
// timeline-style marker, rules instead of cards, typographic page states, a quiet skeleton.
describe("statement language", () => {
  it("Banner is a note with a side rule, no tinted background", () => {
    render(
      <Banner tone="warning" title="La cotización vence pronto">
        Si vence, tenés que pedir una cotización nueva.
      </Banner>,
    );
    const note = screen.getByRole("status");
    expect(note).toHaveTextContent("La cotización vence pronto");
    expect(note.className).toMatch(/\bborder-l-2\b/);
    expect(note.className).not.toMatch(/\bbg-/);
  });

  it("Banner errors still interrupt screen readers", () => {
    render(<Banner tone="error" title="Tu depósito fue devuelto" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Tu depósito fue devuelto");
  });

  it("Badge is plain text with a decorative timeline marker, no pill", () => {
    const { container } = render(<Badge tone="success">Invertido</Badge>);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveTextContent("Invertido");
    expect(badge.className).not.toMatch(/\bbg-|\brounded-control\b|\bpx-/);
    expect(badge.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("RadioCard carries the recommendation as a line inside the option", () => {
    render(
      <RadioCardGroup label="Medio de envío" defaultValue="ar_usdc">
        <RadioCard
          value="ar_usdc"
          title="USDC desde una exchange"
          description="Comisión de 0,30%."
          recommendation="Recomendado: el costo más bajo para este monto."
        />
        <RadioCard value="ar_swift" title="Transferencia SWIFT" />
      </RadioCardGroup>,
    );
    const usdc = screen.getByRole("radio", { name: /USDC desde una exchange/ });
    expect(within(usdc).getByText(/Recomendado: el costo más bajo/)).toBeInTheDocument();
  });

  it("separates RadioCard options with rules instead of boxes", () => {
    render(
      <RadioCardGroup label="Medio de envío">
        <RadioCard value="a" title="A" />
        <RadioCard value="b" title="B" />
      </RadioCardGroup>,
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.className).not.toMatch(/\brounded-card\b|\bbg-paper\b/);
    }
  });

  it("page states are typographic: no large icon", () => {
    const { container } = render(
      <>
        <ErrorState onRetry={() => undefined} />
        <EmptyState title="Todavía no hay aportes" />
      </>,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "No pudimos cargar esta información" }),
    ).toBeInTheDocument();
  });

  it("Skeleton does not pulse", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/animate-pulse/);
  });

  it("Stepper marks done, current and upcoming segments differently", () => {
    const { container } = render(<Stepper steps={["A", "B", "C", "D"]} current={2} />);
    const states = [...container.querySelectorAll("[data-step-state]")].map((el) =>
      el.getAttribute("data-step-state"),
    );
    expect(states).toEqual(["done", "done", "current", "upcoming"]);
    const [done, , current] = container.querySelectorAll<HTMLElement>("[data-step-state]");
    expect(done?.className).not.toBe(current?.className);
  });

  it("Wordmark sizes come from the type scale, with no arbitrary values", () => {
    const { container } = render(
      <>
        <Wordmark />
        <Wordmark size="lg" />
      </>,
    );
    const names = [...container.querySelectorAll("span > span")].map((el) => el.className);
    expect(names.join(" ")).not.toMatch(/\[/);
    expect(names.some((name) => name.includes("type-title"))).toBe(true);
  });

  it("Ledger lays out label/value pairs as a description list between rules", () => {
    render(
      <Ledger>
        <LedgerRow label="Invertido">US$ 11.900,50</LedgerRow>
        <LedgerRow label="En caja">US$ 580,00</LedgerRow>
      </Ledger>,
    );
    const terms = screen.getAllByRole("term");
    expect(terms.map((term) => term.textContent)).toEqual(["Invertido", "En caja"]);
    expect(screen.getAllByRole("definition")[1]).toHaveTextContent("US$ 580,00");
  });

  it("Countdown is a ruled line, with no tinted box, in every phase", () => {
    const now = () => Date.parse("2026-10-27T12:00:00Z");
    const phases = {
      calm: "2026-10-27T12:05:00Z",
      warning: "2026-10-27T12:00:30Z",
      expired: "2026-10-27T11:59:00Z",
    };
    const classes = Object.entries(phases).map(([phase, expiresAt]) => {
      const { container, unmount } = render(
        <Countdown expiresAt={expiresAt} label="La cotización vence en" now={now} />,
      );
      const line = container.firstElementChild as HTMLElement;
      expect(line.className, phase).toMatch(/\bborder-l-2\b/);
      expect(line.className, phase).not.toMatch(/\bbg-|\brounded-control\b|animate-/);
      unmount();
      return line.className;
    });
    // The last minute and expiry change the colour of the text and of the rule.
    expect(new Set(classes).size).toBe(3);
  });

  it("CopyField sits on a rule, with no grey box", () => {
    const { container } = render(<CopyField label="Dirección" value="0xabc" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/\bbg-gray-50\b|\brounded-control\b/);
    expect(screen.getByText("0xabc").parentElement?.className).toMatch(/\bborder-b\b/);
  });

  it("Ledger keeps the label on one line and lets a long text value wrap", () => {
    render(
      <Ledger>
        <LedgerRow label="Medio de envío">USDC desde una exchange</LedgerRow>
      </Ledger>,
    );
    expect(screen.getByRole("term").className).toMatch(/\bshrink-0\b/);
    expect(screen.getByRole("definition").className).not.toMatch(/whitespace-nowrap/);
  });
});

// Each component with a built-in colour must let className replace it (the Wordmark bug).
describe("className overrides win over built-in colours", () => {
  it.each([
    [
      "Button ghost",
      <Button variant="ghost" className="text-brick-700">
        x
      </Button>,
      "text-green-700",
      "text-brick-700",
    ],
    ["Badge", <Badge className="text-gray-600">x</Badge>, "text-graphite-900", "text-gray-600"],
    ["Card", <Card className="bg-cream-50">x</Card>, "bg-paper", "bg-cream-50"],
    ["RiskNote", <RiskNote className="text-graphite-900" />, "text-gray-600", "text-graphite-900"],
    ["Skeleton", <Skeleton className="bg-gray-200" />, "bg-gray-100", "bg-gray-200"],
    ["Input", <Input className="border-navy-900" />, "border-gray-500", "border-navy-900"],
    ["Wordmark", <Wordmark className="text-gold-500" />, "text-navy-900", "text-gold-500"],
  ] as const)("%s", (_name, element, builtIn, override) => {
    const { container } = render(element);
    const html = container.innerHTML;
    expect(html).toContain(override);
    expect(html).not.toContain(builtIn);
  });
});
