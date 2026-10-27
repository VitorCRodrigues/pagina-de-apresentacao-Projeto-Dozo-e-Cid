import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";
import { Input } from "./Input";

describe("Field", () => {
  it("labels the control and links help and error to it", () => {
    render(
      <Field label="CUIL o CUIT" help="11 dígitos, sin guiones." error="El dígito no coincide.">
        <Input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "CUIL o CUIT" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("El dígito no coincide. 11 dígitos, sin guiones.");
  });

  it("leaves a valid control without aria-invalid", () => {
    render(
      <Field label="Teléfono" optional>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /Teléfono/ });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
  });
});
