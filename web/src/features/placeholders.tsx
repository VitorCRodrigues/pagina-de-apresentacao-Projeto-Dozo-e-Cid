import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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

export function ProfileScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t("nav.profile")} />;
}
