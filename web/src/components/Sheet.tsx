import { Dialog as RadixDialog } from "radix-ui";
import { cx } from "@/lib/cx";
import { focusPanel, overlayBackdrop, rootProps, type OverlayProps } from "./component-styles";
import { CloseButton } from "./Dialog";

// Bottom sheet: the mobile surface for secondary detail (how to send, what a cost means).
export function Sheet(props: OverlayProps) {
  const { title, description, footer, children } = props;

  return (
    <RadixDialog.Root {...rootProps(props)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayBackdrop} />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={focusPanel}
          className={cx(
            "outline-none",
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col gap-4",
            "overflow-y-auto rounded-t-card bg-paper px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-overlay",
            "data-[state=open]:animate-[od-sheet-in_var(--od-duration-base)_var(--od-ease)]",
            "data-[state=closed]:animate-[od-sheet-out_var(--od-duration-fast)_var(--od-ease)]",
          )}
        >
          <span aria-hidden={true} className="mx-auto h-1 w-10 rounded-full bg-gray-200" />
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
