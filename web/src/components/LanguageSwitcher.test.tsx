import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("starts in Spanish and switches the UI language", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    expect(screen.getByRole("radiogroup", { name: "Idioma" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Español" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(screen.getByRole("radiogroup", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    expect(document.documentElement.lang).toBe("en");
  });

  it("remembers the choice on this device as an explicit one", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    expect(window.localStorage.getItem("od.locale.choice")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Português" }));
    expect(window.localStorage.getItem("od.locale.choice")).toBe("pt");
  });

  it("choosing the language already shown also counts as the client's choice", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    expect(screen.getByRole("radio", { name: "Español" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Español" }));
    expect(window.localStorage.getItem("od.locale.choice")).toBe("es");
    expect(screen.getByRole("radio", { name: "Español" })).toBeChecked();
  });

  it("tells the screen when the language already shown is chosen, so Perfil saves it too", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<LanguageSwitcher onSelect={onSelect} />);
    await user.click(screen.getByRole("radio", { name: "Español" }));
    expect(onSelect).toHaveBeenCalledWith("es", expect.any(Function));
  });
});
