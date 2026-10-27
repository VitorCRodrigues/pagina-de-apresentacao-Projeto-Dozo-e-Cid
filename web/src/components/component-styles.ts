import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Class strings and helpers shared by several components.

export const controlFrame = cx(
  "flex min-h-12 w-full items-center gap-2 rounded-control border bg-paper px-3",
  "transition-colors duration-fast ease-od",
  "focus-within:border-navy-900 focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-navy-900",
);

export interface OverlayProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  // Actions, primary first. Rendered stacked on mobile.
  footer?: ReactNode;
  children?: ReactNode;
}

export const overlayBackdrop = cx(
  "fixed inset-0 z-40 bg-navy-900/40",
  "data-[state=open]:animate-[od-fade-in_var(--od-duration-base)_var(--od-ease)]",
);

export function rootProps({ open, defaultOpen, onOpenChange }: OverlayProps) {
  return {
    ...(open !== undefined && { open }),
    ...(defaultOpen !== undefined && { defaultOpen }),
    ...(onOpenChange && { onOpenChange }),
  };
}

// Radix focuses the first control (the close button) on open. Focus the panel instead, so the
// title is announced and no focus ring sits on the X.
export function focusPanel(event: Event): void {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
}
