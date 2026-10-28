import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";

interface StepperProps {
  steps: readonly string[];
  // Zero-based index of the current step. Out-of-range or fractional values are clamped,
  // so an unknown step from the API still shows a real one.
  current: number;
}

type StepState = "done" | "current" | "upcoming";

function stepState(step: number, current: number): StepState {
  if (step < current) return "done";
  return step === current ? "current" : "upcoming";
}

// Onboarding progress: one thin segment per step, plus an ordered list for screen readers.
// A labelled group, not <nav>: nothing in it is a link.
export function Stepper({ steps, current }: StepperProps) {
  const { t } = useTranslation();
  const last = Math.max(steps.length - 1, 0);
  const index = Math.min(Math.max(Math.trunc(current), 0), last);

  return (
    <div role="group" aria-label={t("stepper.label")} className="flex flex-col gap-3">
      {/* Same language as the Timeline: done in green, the current step in navy and thicker. */}
      <div aria-hidden={true} className="flex items-center gap-1">
        {steps.map((step, i) => {
          const state = stepState(i, index);
          return (
            <span
              key={`${String(i)}-${step}`}
              data-step-state={state}
              className={cx(
                "flex-1 rounded-full transition-colors duration-base ease-od",
                state === "done" && "h-1 bg-green-700",
                state === "current" && "h-1.5 bg-navy-900",
                state === "upcoming" && "h-1 bg-gray-200",
              )}
            />
          );
        })}
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
