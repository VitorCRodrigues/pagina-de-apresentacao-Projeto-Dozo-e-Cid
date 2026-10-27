import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyField } from "./CopyField";

const address = "0x52908400098527886E0F7030069857D2E4169EE7";

describe("CopyField", () => {
  it("shows the value as text, not as an editable field", () => {
    render(<CopyField label="Dirección de depósito" value={address} />);
    expect(screen.getByText(address)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("copies the value and announces it", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyField label="Dirección de depósito" value={address} />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith(address);
    expect(screen.getByRole("status")).toHaveTextContent("Copiado");
  });

  it("explains when the copy fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CopyField label="Dirección de depósito" value={address} />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(screen.getByRole("status")).toHaveTextContent("No se pudo copiar");
  });
});
