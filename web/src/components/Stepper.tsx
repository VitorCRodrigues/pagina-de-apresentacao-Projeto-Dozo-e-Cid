import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";

interface StepperProps {
  steps: readonly string[];
  // Zero-based index of the current step.
  current: number;
}

// Onboarding progress: one thin segment per step, plus an ordered list for screen readers.
export function Stepper({ steps, current }: StepperProps) {
  const { t } = useTranslation();
  const currentLabel = steps[current];

  return (
    <nav aria-label={t("stepper.label")} className="flex flex-col gap-3">
      <div aria-hidden={true} className="flex gap-1">
        {steps.map((step, index) => (
          <span
            key={step}
            className={cx(
              "h-1 flex-1 rounded-full transition-colors duration-base ease-od",
              index <= current ? "bg-navy-900" : "bg-gray-200",
            )}
          />
        ))}
      </div>
      <p aria-hidden={true} className="flex items-baseline justify-between gap-3">
        <span className="type-label text-navy-900">{currentLabel}</span>
        <span className="type-caption shrink-0 text-gray-600 tabular-nums">
          {t("stepper.progress", { current: current + 1, total: steps.length })}
        </span>
      </p>
      <ol className="sr-only">
        {steps.map((step, index) => (
          <li key={step} {...(index === current && { "aria-current": "step" as const })}>
            {step}
          </li>
        ))}
      </ol>
    </nav>
  );
}
