import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

describe("Timeline", () => {
  it("is an ordered list with the current step marked and every status spoken", () => {
    render(
      <Timeline
        label="Estado del aporte"
        locale="es"
        steps={[
          { id: "a", label: "Cuenta abierta", status: "done", at: "2026-10-23T16:42:00Z" },
          { id: "b", label: "Esperando tu depósito", status: "current" },
          { id: "c", label: "Invertido", status: "upcoming" },
        ]}
      />,
    );

    const list = screen.getByRole("list", { name: "Estado del aporte" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[0]).toHaveTextContent("Completado");
    expect(items[2]).toHaveTextContent("Pendiente");
    expect(within(items[0] as HTMLElement).getByText(/2026/)).toHaveAttribute(
      "datetime",
      "2026-10-23T16:42:00Z",
    );
  });
});
