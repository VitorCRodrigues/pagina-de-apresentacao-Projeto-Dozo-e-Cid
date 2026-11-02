import { useTranslation } from "react-i18next";
import { useConfig } from "@/api/hooks/config";
import { buttonClass } from "@/components/component-styles";
import { ErrorState, LoadingState } from "@/components/PageState";
import { cx } from "@/lib/cx";
import { asLocale } from "@/lib/locale";
import { SUPPORT_EMAIL } from "@/lib/support";
import { FaqList } from "./FaqList";

// T13: frequently asked questions and the support channel. Lives inside Perfil (decision 13).
export function HelpScreen() {
  const { t, i18n } = useTranslation("profile");
  const locale = asLocale(i18n.language);
  const config = useConfig();

  let faq;
  if (config.data) faq = <FaqList config={config.data} locale={locale} />;
  else if (config.isError) faq = <ErrorState onRetry={() => void config.refetch()} />;
  else faq = <LoadingState />;

  return (
    <section className="flex flex-col gap-10 py-2">
      <h1 className="type-title text-navy-900">{t("help.title")}</h1>
      <section aria-labelledby="help-faq" className="flex flex-col gap-3">
        <h2 id="help-faq" className="type-heading text-navy-900">
          {t("help.faqTitle")}
        </h2>
        {faq}
      </section>
      <section aria-labelledby="help-support" className="flex flex-col gap-3">
        <h2 id="help-support" className="type-heading text-navy-900">
          {t("help.supportTitle")}
        </h2>
        <div className="flex flex-col items-start gap-1 border-y border-gray-200 py-4">
          <p className="type-body select-all break-all text-graphite-900">{SUPPORT_EMAIL}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cx(buttonClass("ghost", "never"), "-ml-1")}
          >
            {t("help.supportAction")}
          </a>
        </div>
      </section>
    </section>
  );
}
