import { Dialog as RadixDialog } from "radix-ui";
import { cx } from "@/lib/cx";
import { overlayBackdrop, rootProps, type OverlayProps } from "./component-styles";
import { CloseButton } from "./Dialog";
import { useOverlayFocus } from "./overlay-focus";

// Bottom sheet: the mobile surface for secondary detail (how to send, what a cost means).
export function Sheet(props: OverlayProps) {
  const { title, description, footer, children } = props;
  const focus = useOverlayFocus();

  return (
    <RadixDialog.Root {...rootProps(props)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayBackdrop} />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          {...focus}
          className={cx(
            "outline-none",
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col gap-4",
            "overflow-y-auto rounded-t-card bg-paper px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-overlay",
            "data-[state=open]:animate-[od-sheet-in_var(--od-duration-base)_var(--od-ease)]",
            "data-[state=closed]:animate-[od-sheet-out_var(--od-duration-fast)_var(--od-ease)]",
            // Desktop: a dialog in the middle, like Dialog; a sheet at the bottom of a wide
            // screen sits far from where the client was reading.
            "lg:top-1/2 lg:bottom-auto lg:max-w-[440px] lg:-translate-y-1/2 lg:rounded-card lg:p-6",
            "lg:data-[state=open]:animate-[od-rise-in_var(--od-duration-base)_var(--od-ease)]",
            "lg:data-[state=closed]:animate-none",
          )}
        >
          <span
            aria-hidden={true}
            data-sheet-handle=""
            className="mx-auto h-1 w-10 rounded-full bg-gray-200 lg:hidden"
          />
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="type-heading text-navy-900">{title}</RadixDialog.Title>
            <CloseButton />
          </div>
          {description && (
            <RadixDialog.Description className="type-body text-graphite-900">
              {description}
            </RadixDialog.Description>
          )}
          {children}
          {footer && <div className="flex flex-col gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
