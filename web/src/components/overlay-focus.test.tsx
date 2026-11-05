import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./Dialog";
import { Sheet } from "./Sheet";

// The app opens overlays from state, never from a Radix Trigger, so Radix has nothing to give
// the focus back to and drops it on <body>: a keyboard user starts over from the top.
function Opener({ Overlay }: { Overlay: typeof Dialog }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Abrir
      </button>
      <Overlay open={open} onOpenChange={setOpen} title="Título" />
    </>
  );
}

describe.each([
  ["Dialog", Dialog],
  ["Sheet", Sheet],
])("%s", (_name, Overlay) => {
  it("gives the focus back to what opened it, on Escape and on the close button", async () => {
    const user = userEvent.setup();
    render(<Opener Overlay={Overlay} />);
    const opener = screen.getByRole("button", { name: "Abrir" });

    await user.click(opener);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(await screen.findByRole("button", { name: "Cerrar" }));
    expect(opener).toHaveFocus();
  });
});
