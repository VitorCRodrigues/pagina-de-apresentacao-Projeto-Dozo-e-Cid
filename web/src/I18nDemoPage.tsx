// TODO(decisão): temporary page that only proves i18n; remove when T1 exists.
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function I18nDemoPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("dev.i18nDemo.title")}</h1>
      <p>{t("dev.i18nDemo.body")}</p>
      <LanguageSwitcher />
    </main>
  );
}
