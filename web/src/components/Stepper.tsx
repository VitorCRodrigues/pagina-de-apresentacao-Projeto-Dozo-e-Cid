import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";

interface StepperProps {
  steps: readonly string[];
  // Zero-based index of the current step. Out-of-range or fractional values are clamped,
  // so an unknown step from the API still shows a real one.
  current: number;
}

// Onboarding progress: one thin segment per step, plus an ordered list for screen readers.
// A labelled group, not <nav>: nothing in it is a link.
export function Stepper({ steps, current }: StepperProps) {
  const { t } = useTranslation();
  const last = Math.max(steps.length - 1, 0);
  const index = Math.min(Math.max(Math.trunc(current), 0), last);

  return (
    <div role="group" aria-label={t("stepper.label")} className="flex flex-col gap-3">
      <div aria-hidden={true} className="flex gap-1">
        {steps.map((step, i) => (
          <span
            key={`${String(i)}-${step}`}
            className={cx(
              "h-1 flex-1 rounded-full transition-colors duration-base ease-od",
              i <= index ? "bg-navy-900" : "bg-gray-200",
            )}
          />
        ))}
      </div>
      <p aria-hidden={true} className="flex items-baseline justify-between gap-3">
        <span className="type-label text-navy-900">{steps[index]}</span>
        <span className="type-caption shrink-0 text-gray-600 tabular-nums">
          {t("stepper.progress", { current: index + 1, total: steps.length })}
        </span>
      </p>
      <ol className="sr-only">
        {steps.map((step, i) => (
          <li
            key={`${String(i)}-${step}`}
            {...(i === index && { "aria-current": "step" as const })}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
