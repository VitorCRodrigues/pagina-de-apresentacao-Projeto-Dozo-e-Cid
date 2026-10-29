import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Questionnaire } from "@/api/proposed-types";
import { Checkbox } from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { RadioCard, RadioCardGroup } from "@/components/RadioCard";

export type Question = Questionnaire["questions"][number];

interface QuestionFieldProps {
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string | undefined;
}

// One question per block: the question as the legend, the options as statement lines.
export function QuestionField({ question, value, onChange, error }: QuestionFieldProps) {
  const { t } = useTranslation();
  const errorId = useId();

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-3 border-t border-gray-200 pt-6 first:border-t-0 first:pt-0"
    >
      <legend className="type-heading float-left mb-3 w-full text-navy-900">
        {question.label}
      </legend>
      {question.kind === "multi" && (
        <p className="type-caption clear-left text-gray-600">
          {t("onboarding.suitability.multiHint")}
        </p>
      )}
      <div className="clear-left">
        {question.kind === "single" ? (
          <RadioCardGroup
            label={question.label}
            value={typeof value === "string" ? value : ""}
            onValueChange={onChange}
          >
            {question.options.map((option) => (
              <RadioCard key={option.value} value={option.value} title={option.label} />
            ))}
          </RadioCardGroup>
        ) : (
          <div className="flex flex-col gap-4 border-y border-gray-200 py-4">
            {question.options.map((option) => {
              const picked = Array.isArray(value) ? value : [];
              return (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={picked.includes(option.value)}
                  onCheckedChange={(checked) => {
                    onChange(
                      checked
                        ? [...picked, option.value]
                        : picked.filter((item) => item !== option.value),
                    );
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="type-caption flex items-start gap-1.5 text-brick-700">
          <Icon icon={CircleAlert} size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
