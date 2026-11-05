import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./Field";
import { Select } from "./Select";

const options = [
  { value: "1", label: "Día 1" },
  { value: "5", label: "Día 5" },
];

// Native <select>: the phone's own picker, and no aria-hidden over the rest of the page.
describe("Select", () => {
  it("is a native select, labelled and described by its Field", () => {
    render(
      <Field label="Día del mes" help="De 1 a 28.">
        <Select options={options} defaultValue="5" />
      </Field>,
    );
    const select = screen.getByRole("combobox", { name: "Día del mes" });
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAccessibleDescription("De 1 a 28.");
    expect(select).toHaveValue("5");
  });

  it("starts on a placeholder that cannot be chosen back", () => {
    render(<Select options={options} placeholder="Elegí un día" />);
    const placeholder = screen.getByRole("option", { name: "Elegí un día" });
    expect(placeholder).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("tells the form the chosen value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Select options={options} value="" onValueChange={onValueChange} />);
    await user.selectOptions(screen.getByRole("combobox"), "Día 5");
    expect(onValueChange).toHaveBeenCalledWith("5");
  });

  it("marks an invalid field", () => {
    render(
      <Field label="Día del mes" error="Elegí un día.">
        <Select options={options} value="" />
      </Field>,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the placeholder for a value that matches no option, never a stranger's first option", () => {
    render(<Select options={options} value="undefined" placeholder="Elegí un día" />);
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Elegí un día" })).toHaveProperty("selected", true);
  });
});
