import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

const steps = ["País", "Datos personales", "Domicilio", "Revisión"];

describe("Stepper", () => {
  it("is a labelled group, not a navigation landmark (it has no links)", () => {
    render(<Stepper steps={steps} current={1} />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("group", { name: "Progreso" })).toBeInTheDocument();
  });

  it("marks the current step in an ordered list for screen readers", () => {
    render(<Stepper steps={steps} current={1} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items.filter((item) => item.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it.each([
    [-1, "País", "Paso 1 de 4"],
    [99, "Revisión", "Paso 4 de 4"],
    [2.5, "Domicilio", "Paso 3 de 4"],
  ])("clamps current=%s to an existing step", (current, label, progress) => {
    render(<Stepper steps={steps} current={current} />);
    expect(screen.getByText(label, { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(progress)).toBeInTheDocument();
  });

  it("accepts repeated labels without key collisions", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<Stepper steps={["Documento", "Documento"]} current={0} />);
    expect(error).not.toHaveBeenCalled();
  });
});
