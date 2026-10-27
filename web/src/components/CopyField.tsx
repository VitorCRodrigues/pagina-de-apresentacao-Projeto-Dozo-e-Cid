import { Check, Copy } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

interface CopyFieldProps {
  label: string;
  value: string;
  // Monospace for addresses and references, where every character matters.
  mono?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

// Read-only value with a copy button. The client never types an address (PRD section 5).
export function CopyField({ label, value, mono = true }: CopyFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => {
      setState("idle");
    }, 2000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="type-label text-graphite-900">
        {label}
      </span>
      <div className="flex items-stretch overflow-hidden rounded-control border border-gray-200 bg-gray-50">
        <p
          id={`${id}-value`}
          className={cx(
            "min-w-0 flex-1 px-3 py-3 break-all text-graphite-900 select-all",
            mono ? "type-mono" : "type-body",
          )}
        >
          {value}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          aria-describedby={`${id}-label`}
          className={cx(
            "type-label inline-flex min-w-24 shrink-0 items-center justify-center gap-1.5 border-l border-gray-200 px-3",
            "transition-colors duration-fast ease-od hover:bg-gray-100",
            state === "copied" ? "text-green-700" : "text-navy-900",
          )}
        >
          <Icon icon={state === "copied" ? Check : Copy} size={16} />
          {state === "copied" ? t("copy.done") : t("copy.action")}
        </button>
      </div>
      <p role="status" aria-live="polite" className={state === "failed" ? "" : "sr-only"}>
        {state === "copied" && t("copy.done")}
        {state === "failed" && (
          <span className="type-caption text-brick-700">{t("copy.failed")}</span>
        )}
      </p>
    </div>
  );
}
