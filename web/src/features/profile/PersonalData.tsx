import { useTranslation } from "react-i18next";
import { useAccount } from "@/api/hooks/account";
import type { Locale, Me } from "@/api/types";
import { buttonClass } from "@/components/component-styles";
import { Ledger, LedgerRow } from "@/components/Ledger";
import { countryName } from "@/features/onboarding/countries";
import { cx } from "@/lib/cx";
import { toIntlLocale } from "@/lib/locale";
import { SUPPORT_EMAIL } from "@/lib/support";
import { ProfileSection } from "./ProfileSection";

// Read-only: changes go through support (PRD T12). Only what the app already needs; address and
// tax id stay out of this screen (PRD section 10, minimum data).
export function PersonalData({ me, locale }: { me: Me; locale: Locale }) {
  const { t } = useTranslation("profile");
  const { data: account } = useAccount();
  const value = "type-body break-words";

  return (
    <ProfileSection title={t("profile.data.title")}>
      <Ledger>
        <LedgerRow label={t("profile.data.name")}>
          <span className={value}>{me.name}</span>
        </LedgerRow>
        <LedgerRow label={t("profile.data.email")}>
          <span className={value}>{me.email}</span>
        </LedgerRow>
        <LedgerRow label={t("profile.data.country")}>
          <span className={value}>{countryName(me.country, toIntlLocale(locale))}</span>
        </LedgerRow>
        {account?.ibkrAccountMasked && (
          <LedgerRow label={t("profile.data.account")}>
            <span className={cx(value, "tabular-nums")}>{account.ibkrAccountMasked}</span>
          </LedgerRow>
        )}
      </Ledger>
      <div className="flex flex-col items-start gap-1">
        <p className="type-caption text-gray-600">{t("profile.data.note")}</p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={cx(buttonClass("ghost", "never"), "-ml-1")}>
          {t("profile.data.support")}
        </a>
      </div>
    </ProfileSection>
  );
}
