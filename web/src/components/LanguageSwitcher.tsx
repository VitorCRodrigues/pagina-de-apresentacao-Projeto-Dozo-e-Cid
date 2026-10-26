import { ToggleGroup } from "radix-ui";
import { useTranslation } from "react-i18next";
import { supportedLocales, type SupportedLocale } from "@/i18n";

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <ToggleGroup.Root
      type="single"
      value={i18n.resolvedLanguage}
      onValueChange={(value) => {
        // Radix sends "" when the active item is clicked again; keep the current locale.
        if (isSupportedLocale(value)) void i18n.changeLanguage(value);
      }}
      aria-label={t("language.label")}
      className="inline-flex gap-1"
    >
      {supportedLocales.map((locale) => (
        <ToggleGroup.Item
          key={locale}
          value={locale}
          lang={locale}
          className="rounded border px-3 py-1 data-[state=on]:font-semibold"
        >
          {t(`language.${locale}`)}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
