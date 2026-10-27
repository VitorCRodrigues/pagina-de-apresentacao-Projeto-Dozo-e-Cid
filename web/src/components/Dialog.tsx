import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { overlayBackdrop, rootProps, type OverlayProps } from "./component-styles";
import { Icon } from "./Icon";

export function CloseButton() {
  const { t } = useTranslation();
  return (
    <RadixDialog.Close
      aria-label={t("common.close")}
      className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-gray-600 hover:bg-gray-50"
    >
      <Icon icon={X} />
    </RadixDialog.Close>
  );
}

export function Dialog(props: OverlayProps) {
  const { title, description, footer, children } = props;

  return (
    <RadixDialog.Root {...rootProps(props)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayBackdrop} />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cx(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "flex flex-col gap-4 rounded-card bg-paper p-6 shadow-overlay",
            "data-[state=open]:animate-[od-rise-in_var(--od-duration-base)_var(--od-ease)]",
          )}
        >
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
          {footer && <div className="mt-2 flex flex-col gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
