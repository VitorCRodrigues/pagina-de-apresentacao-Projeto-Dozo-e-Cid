import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { scenarioUrl, setScenario } from "./scenario-state";

describe("ScenarioSwitcher", () => {
  it("shows the active scenario and lists all 27, grouped", async () => {
    const user = userEvent.setup();
    setScenario("ibkr_pending");
    render(<ScenarioSwitcher onSelect={vi.fn()} />);

    const toggle = screen.getByText(/ibkr_pending/, { selector: "summary" });
    await user.click(toggle);

    const select = screen.getByRole("combobox", { name: "Escenario de prueba" });
    expect(select).toHaveValue("ibkr_pending");
    expect(within(select).getAllByRole("option")).toHaveLength(27);
    expect(select.querySelectorAll("optgroup")).toHaveLength(4);
  });

  it("hands the chosen scenario to onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScenarioSwitcher onSelect={onSelect} />);

    await user.click(screen.getByText(/open/, { selector: "summary" }));
    await user.selectOptions(screen.getByRole("combobox"), "returned");
    expect(onSelect).toHaveBeenCalledWith("returned");
  });

  it("builds the URL with ?scenario=, keeping the path and other parameters", () => {
    expect(scenarioUrl("returned", "http://localhost:5173/inicio?x=1#top")).toBe(
      "http://localhost:5173/inicio?x=1&scenario=returned#top",
    );
    expect(scenarioUrl("open", "http://localhost:5173/?scenario=slow")).toBe(
      "http://localhost:5173/?scenario=open",
    );
  });
});
