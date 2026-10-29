import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useTermsDocuments } from "@/api/hooks/account";
import type { TermsDocument } from "@/api/proposed-types";
import { Checkbox } from "@/components/Checkbox";
import { ErrorState, LoadingState } from "@/components/PageState";
import { termsFromDraft, termsSchema, toTermsDraft } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

// Step 7. One box per document from GET /account/terms, in the API order, none pre-checked.
export function TermsStep() {
  const terms = useTermsDocuments();
  if (terms.isPending) return <LoadingState />;
  if (terms.isError) return <ErrorState onRetry={() => void terms.refetch()} />;
  return <TermsForm docs={terms.data} />;
}

function TermsForm({ docs }: { docs: TermsDocument[] }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const schema = useMemo(() => termsSchema(docs), [docs]);

  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "terms",
    schema,
    // Each value is when the box was ticked (api-gaps.md, item 2); "" while unticked.
    empty: { checked: Object.fromEntries(docs.map((doc) => [doc.id, ""])) },
    fromDraft: (saved) => ({
      checked: {
        ...Object.fromEntries(docs.map((doc) => [doc.id, ""])),
        ...termsFromDraft(docs, saved),
      },
    }),
    toDraft: ({ checked }) => toTermsDraft(docs, checked),
  });

  return (
    <StepPage step="terms" onSubmit={onSubmit} onBack={back} saving={saving} saveError={saveError}>
      <ul className="flex flex-col border-y border-gray-200">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-2 border-t border-gray-200 py-4 first:border-t-0"
          >
            <Controller
              control={form.control}
              name={`checked.${doc.id}`}
              render={({ field, fieldState }) => (
                <>
                  <Checkbox
                    label={t("onboarding.terms.accept", { title: doc.title })}
                    checked={field.value !== ""}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? new Date().toISOString() : "");
                    }}
                    description={
                      <span className="flex flex-col gap-2">
                        {doc.kind === "ibkr_data_consent" && (
                          <span>{t("onboarding.terms.ibkrConsent")}</span>
                        )}
                        {/* TODO(compliance): drafts until legal signs the final texts. */}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="self-start text-green-700 underline underline-offset-4"
                        >
                          {t("onboarding.terms.read")}
                        </a>
                      </span>
                    }
                  />
                  {fieldState.error && (
                    <p className="type-caption pl-8 text-brick-700">
                      {errorText(fieldState.error)}
                    </p>
                  )}
                </>
              )}
            />
          </li>
        ))}
      </ul>
    </StepPage>
  );
}
