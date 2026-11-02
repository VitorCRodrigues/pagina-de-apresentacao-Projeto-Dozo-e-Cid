import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useConfig } from "@/api/hooks/config";
import { useMe, useSuitability } from "@/api/hooks/account";
import type { Locale } from "@/api/types";
import { Banner } from "@/components/Banner";
import { buttonClass } from "@/components/component-styles";
import { Icon } from "@/components/Icon";
import { LoadingState } from "@/components/PageState";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/dates";
import { asLocale } from "@/lib/locale";
import { paths } from "@/routes";
import { LanguageSection } from "./LanguageSection";
import { LogoutAction } from "./LogoutAction";
import { NotificationsSection } from "./NotificationsSection";
import { PersonalData } from "./PersonalData";
import { ProfileRow, ProfileSection, sectionBlock } from "./ProfileSection";
import { TermsSection } from "./TermsSection";

export interface ProfileLocationState {
  suitabilitySaved?: boolean;
}

// T12. An index, so no primary action. Who the client is, then what they come for (their
// investment, getting money out, what they signed), then what rarely changes. Each section loads
// and fails on its own; the session guard already holds GET /me and GET /config.
export function ProfileScreen() {
  const { t, i18n } = useTranslation("profile");
  const locale = asLocale(i18n.language);
  const { data: me } = useMe();
  const { state } = useLocation() as { state: ProfileLocationState | null };

  if (!me) return <LoadingState />;

  return (
    <section className="flex flex-col gap-10 py-2">
      <h1 className="type-title text-navy-900">{t("profile.title")}</h1>
      {state?.suitabilitySaved && <Banner title={t("profile.suitability.saved")} quiet />}
      <PersonalData me={me} locale={locale} />
      <InvestingSection locale={locale} />
      <WithdrawalsSection />
      <TermsSection locale={locale} />
      <ProfileSection title={t("profile.preferences")}>
        <div className={cx(sectionBlock, "gap-6")}>
          <LanguageSection />
          <NotificationsSection />
        </div>
      </ProfileSection>
      <ComingSoonSection />
      <div className="flex flex-col gap-4">
        <ul className="border-y border-gray-200">
          <ProfileRow to={paths.help} label={t("profile.help")} />
        </ul>
        <LogoutAction />
      </div>
    </section>
  );
}

function InvestingSection({ locale }: { locale: Locale }) {
  const { t } = useTranslation("profile");
  const { data: suitability } = useSuitability();
  return (
    <ProfileSection title={t("profile.investing.title")}>
      <ul className="border-y border-gray-200">
        <ProfileRow to={paths.plan} label={t("profile.investing.plan")} />
        <ProfileRow
          to={paths.suitability}
          label={t("profile.investing.suitability")}
          detail={
            suitability?.completedAt &&
            t("profile.investing.suitabilityDate", {
              date: formatDate(suitability.completedAt, locale),
            })
          }
        />
      </ul>
    </ProfileSection>
  );
}

// Never a withdrawal screen or a credential field: only the way out to Interactive Brokers.
function WithdrawalsSection() {
  const { t } = useTranslation("profile");
  const { data: config } = useConfig();
  return (
    <ProfileSection title={t("profile.withdrawals.title")}>
      <div className={cx(sectionBlock, "items-start gap-1")}>
        <p className="type-body max-w-prose text-graphite-900">{t("profile.withdrawals.body")}</p>
        {config && (
          <a
            href={config.ibkrPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(buttonClass("ghost", "never"), "-ml-1")}
          >
            {t("profile.withdrawals.action")}
            <span className="sr-only"> {t("profile.withdrawals.newTab")}</span>
            <Icon icon={ExternalLink} size={16} />
          </a>
        )}
      </div>
    </ProfileSection>
  );
}

// Decisions 2 and 3: visible, not available. Plain lines: nothing to press.
function ComingSoonSection() {
  const { t } = useTranslation("profile");
  return (
    <ProfileSection title={t("profile.soon.title")}>
      <ul className="border-y border-gray-200">
        {([t("profile.soon.reports"), t("profile.soon.card")] as const).map((name) => (
          <li key={name} className="border-t border-gray-200 first:border-t-0">
            {/* A disabled navigation item (decision 3): announced as such, with no target. */}
            <span
              role="link"
              aria-disabled={true}
              className="flex min-h-12 items-center justify-between gap-4 py-3"
            >
              <span className="type-body text-gray-600">{name}</span>
              <span className="type-caption text-gray-600">{t("profile.soon.label")}</span>
            </span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
