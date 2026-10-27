import { CircleAlert } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { FieldContext, type FieldControlProps } from "./field-context";
import { Icon } from "./Icon";

interface FieldProps {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, help, error, optional = false, children, className }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  const control = useMemo<FieldControlProps>(() => {
    const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(" ");
    return {
      id,
      ...(describedBy ? { "aria-describedby": describedBy } : {}),
      ...(error ? { "aria-invalid": true as const } : {}),
    };
  }, [id, helpId, errorId, help, error]);

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="type-label text-graphite-900">
        {label}
        {optional && (
          <span className="type-caption ml-1 text-gray-600">({t("common.optional")})</span>
        )}
      </label>
      <FieldContext value={control}>{children}</FieldContext>
      {error && (
        <p id={errorId} className="type-caption flex items-start gap-1.5 text-brick-700">
          <Icon icon={CircleAlert} size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}
      {help && (
        <p id={helpId} className="type-caption text-gray-600">
          {help}
        </p>
      )}
    </div>
  );
}
