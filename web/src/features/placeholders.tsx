import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMe } from "@/api/hooks/account";
import { Badge } from "@/components/Badge";

// TODO(decisão): stand-ins so routing and navigation work end to end. Each one is replaced
// by its real screen (T2–T12) in the next phases.

function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3 py-6">
      <h1 className="type-title text-navy-900">{title}</h1>
      {children}
      <p className="type-body text-gray-600">{t("dev.placeholder")}</p>
    </section>
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.home")} />;
}

export function DepositScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.deposit")} />;
}

export function PortfolioScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.portfolio")} />;
}

export function PendingScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.pending")} />;
}

export function ProfileScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.profile")} />;
}

export function OnboardingScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("accountStatus.draft")} />;
}

export function AccountStatusScreen() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  return (
    <Placeholder title={t("accountStatus.label")}>
      {me && (
        <Badge tone="info" className="self-start">
          {t(`accountStatus.${me.accountStatus}`)}
        </Badge>
      )}
    </Placeholder>
  );
}
