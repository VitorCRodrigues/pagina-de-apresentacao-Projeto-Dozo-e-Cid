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

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export const buttonBase = cx(
  "type-label inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5",
  "transition-colors duration-fast ease-od",
);

// Primary is always navy; gold is never a button (decisions.md, 27/10).
export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-navy-900 text-cream-50 hover:bg-navy-800",
  secondary: "border border-navy-900 text-navy-900 hover:bg-gray-50",
  // Reads as a text link: everything that is not the one primary action (direction doc).
  ghost: "text-green-700 underline decoration-1 underline-offset-4 hover:decoration-2 px-1",
  destructive: "bg-brick-700 text-white hover:opacity-90",
};

export const buttonWidths = {
  mobile: "w-full sm:w-auto",
  always: "w-full",
  never: "",
} as const;

// A navigation that looks like a button (a router Link to the next screen).
export function buttonClass(
  variant: ButtonVariant = "primary",
  fullWidth: keyof typeof buttonWidths = "mobile",
): string {
  return cx(
    buttonBase,
    variant === "ghost" && "min-h-11",
    buttonVariants[variant],
    buttonWidths[fullWidth],
  );
}
