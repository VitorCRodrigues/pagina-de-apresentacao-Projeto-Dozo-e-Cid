import { X } from "lucide-react";
import { Toast as RadixToast } from "radix-ui";
import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";
import { ToastContext, type ToastMessage } from "./toast-context";

interface QueuedToast extends ToastMessage {
  id: number;
}

let nextId = 0;

export function ToastProvider({
  children,
  initial = [],
}: {
  children: ReactNode;
  // Toasts shown on mount; used by stories and tests.
  initial?: ToastMessage[];
}) {
  const [toasts, setToasts] = useState<QueuedToast[]>(() =>
    initial.map((message) => ({ ...message, id: nextId++ })),
  );

  const toast = useCallback((message: ToastMessage) => {
    setToasts((current) => [...current, { ...message, id: nextId++ }]);
  }, []);

  return (
    <ToastContext value={toast}>
      <RadixToast.Provider duration={5000} swipeDirection="down">
        {children}
        {toasts.map((item) => (
          <ToastItem
            key={item.id}
            message={item}
            onClose={() => {
              setToasts((current) => current.filter((t) => t.id !== item.id));
            }}
          />
        ))}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext>
  );
}

function ToastItem({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  const { t } = useTranslation();
  const isError = message.tone === "error";

  return (
    <RadixToast.Root
      type={isError ? "foreground" : "background"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={cx(
        "flex items-start gap-3 rounded-card px-4 py-3 shadow-overlay",
        isError ? "bg-brick-700 text-white" : "bg-navy-900 text-cream-50",
        "data-[state=open]:animate-[od-rise-in_var(--od-duration-base)_var(--od-ease)]",
      )}
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <RadixToast.Title className="type-label">{message.title}</RadixToast.Title>
        {message.description && (
          <RadixToast.Description className="type-caption opacity-90">
            {message.description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close
        aria-label={t("common.close")}
        className="-mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-control hover:bg-white/10"
      >
        <Icon icon={X} size={16} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
