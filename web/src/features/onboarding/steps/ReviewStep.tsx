import { useQueryClient } from "@tanstack/react-query";
import { useId, useRef, type SyntheticEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { isApiError } from "@/api/errors";
import { useApi } from "@/api/api-context";
import { getMe } from "@/api/endpoints";
import { useQuestionnaire, useSubmitOnboarding } from "@/api/hooks/onboarding";
import type { OnboardingStep } from "@/api/proposed-types";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { formatCuit } from "@/lib/cuit";
import { formatDate } from "@/lib/dates";
import { asLocale, toIntlLocale } from "@/lib/locale";
import { paths } from "@/routes";
import { countryName, provinces, type ProvinceCode } from "../countries";
import { useOnboardingContext } from "../onboarding-context";
import { StepPage } from "../StepPage";
import type { ReturnState } from "../useStepForm";

type Row = [label: string, value: ReactNode];

// The application as a statement: one section per step, label above value, hairlines between
// lines. Labels can be whole questions, so they stack instead of sharing a line with the value.
function ReviewSection({ step, rows }: { step: OnboardingStep; rows: Row[] | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const headingId = useId();
  const title = t(`onboarding.steps.${step}`);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="type-heading text-navy-900">
          {title}
        </h2>
        <Button
          variant="ghost"
          fullWidth="never"
          aria-label={t("onboarding.review.editSection", { section: title })}
          onClick={() => {
            const state: ReturnState = { returnTo: "review" };
            void navigate(paths.onboardingStep(step), { state });
          }}
        >
          {t("onboarding.actions.edit")}
        </Button>
      </div>
      <dl className="border-y border-gray-200">
        {rows === null ? (
          <div className="py-3">
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          rows.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 border-t border-gray-200 py-3 first:border-t-0"
            >
              <dt className="type-caption text-gray-600">{label}</dt>
              <dd className="type-body break-words text-graphite-900">{value}</dd>
            </div>
          ))
        )}
      </dl>
    </section>
  );
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

// Step 8. Every section can be edited (it comes back here), then POST /onboarding/submit.
export function ReviewStep() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const api = useApi();
  const { draft } = useOnboardingContext();
  const questionnaire = useQuestionnaire();
  const submit = useSubmitOnboarding();
  const sending = useRef(false);
  const locale = asLocale(i18n.language);
  const intlLocale = toIntlLocale(locale);
  const {
    residence = {},
    personal = {},
    address = {},
    suitability = {},
    funds = {},
    terms = {},
  } = draft.steps;

  // A 422 can mean "already submitted" (another tab, a retry) or a real problem with the
  // draft. Only a fresh /me that is no longer a draft sends the client to the account status.
  async function alreadySubmitted(error: unknown): Promise<boolean> {
    if (!isApiError(error) || error.code !== "validation_failed") return false;
    try {
      const me = await queryClient.query({
        queryKey: queryKeys.me,
        queryFn: () => getMe(api),
        staleTime: 0,
      });
      return me.accountStatus !== "draft";
    } catch {
      return false;
    }
  }

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    // A double tap must not send the application twice.
    if (sending.current) return;
    sending.current = true;
    try {
      await submit.mutateAsync();
    } catch (error) {
      sending.current = false;
      if (!(await alreadySubmitted(error))) return; // the error note says what failed
    }
    void navigate(paths.accountStatus, { replace: true });
  }

  const answers = (suitability.answers ?? {}) as Record<string, string | string[]>;
  const profileRows: Row[] | null = questionnaire.data
    ? questionnaire.data.questions.map((question) => {
        const picked = [answers[question.id] ?? []].flat();
        const labels = question.options
          .filter((option) => picked.includes(option.value))
          .map((option) => option.label);
        return [question.label, labels.join(", ")];
      })
    : null;

  const street = [text(address.street), text(address.unit)].filter(Boolean).join(", ");
  const province = text(address.province);
  const acceptedCount = Array.isArray(terms.accepted) ? terms.accepted.length : 0;

  return (
    <StepPage
      step="review"
      onSubmit={onSubmit}
      onBack={() => void navigate(paths.onboardingStep("terms"))}
      saving={submit.isPending}
      saveError={submit.error}
      primaryLabel={t("onboarding.actions.submit")}
    >
      <ReviewSection
        step="residence"
        rows={[
          [t("onboarding.residence.country"), countryName(text(residence.country), intlLocale)],
          [
            t("onboarding.residence.nationality"),
            countryName(text(residence.nationality), intlLocale),
          ],
        ]}
      />
      <ReviewSection
        step="personal"
        rows={[
          [t("onboarding.personal.fullName"), text(personal.fullName)],
          [
            t("onboarding.personal.birthDate"),
            personal.birthDate
              ? formatDate(text(personal.birthDate), locale, { timeZone: "UTC" })
              : "",
          ],
          [t("onboarding.personal.dni"), text(personal.dni)],
          [t("onboarding.personal.cuil"), formatCuit(text(personal.cuil))],
          [t("onboarding.personal.email"), text(personal.email)],
          [t("onboarding.personal.phone"), text(personal.phone)],
        ]}
      />
      <ReviewSection
        step="address"
        rows={[
          [t("onboarding.address.street"), street],
          [t("onboarding.address.city"), text(address.city)],
          [
            t("onboarding.address.province"),
            province in provinces ? provinces[province as ProvinceCode] : province,
          ],
          [t("onboarding.address.postalCode"), text(address.postalCode).toUpperCase()],
        ]}
      />
      <ReviewSection step="suitability" rows={profileRows} />
      <ReviewSection
        step="funds"
        rows={[
          [
            t("onboarding.funds.occupation"),
            funds.occupation
              ? t(`onboarding.funds.occupations.${text(funds.occupation) as "other"}`)
              : "",
          ],
          [
            t("onboarding.funds.source"),
            funds.sourceOfFunds
              ? t(`onboarding.funds.sources.${text(funds.sourceOfFunds) as "other"}`)
              : "",
          ],
          [
            t("onboarding.funds.pep"),
            funds.isPep === true
              ? `${t("onboarding.funds.yes")}: ${text(funds.pepRole)}`
              : t("onboarding.funds.no"),
          ],
        ]}
      />
      <ReviewSection
        step="identity"
        rows={[[t("onboarding.steps.identity"), t("onboarding.review.verified")]]}
      />
      <ReviewSection
        step="terms"
        rows={[
          [
            t("onboarding.steps.terms"),
            t("onboarding.review.termsAccepted", { count: acceptedCount }),
          ],
        ]}
      />
      <p className="type-caption text-gray-600">{t("onboarding.review.after")}</p>
    </StepPage>
  );
}
