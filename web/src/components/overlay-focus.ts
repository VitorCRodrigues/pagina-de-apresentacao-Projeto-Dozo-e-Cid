import { useRef } from "react";
import { focusPanel } from "./component-styles";

// Dialogs and sheets open from state, not from a Radix Trigger, so on close Radix has nothing to
// return the focus to and leaves it on <body>. Remember what had the focus when the overlay
// opened and give it back; if that control is gone (the row it was on was resolved), the screen's
// <main> takes it, so the next Tab starts where the client was, not at the top of the page.
export function useOverlayFocus() {
  const returnTo = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus(event: Event) {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
      focusPanel(event);
    },
    onCloseAutoFocus(event: Event) {
      event.preventDefault();
      const target = returnTo.current?.isConnected ? returnTo.current : null;
      (target ?? document.getElementById("main"))?.focus();
      returnTo.current = null;
    },
  };
}
