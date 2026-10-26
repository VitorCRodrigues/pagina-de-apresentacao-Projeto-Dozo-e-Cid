import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
