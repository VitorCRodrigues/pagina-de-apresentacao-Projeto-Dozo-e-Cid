import { ToggleGroup } from "radix-ui";
import { useTranslation } from "react-i18next";
import { supportedLocales, type SupportedLocale } from "@/i18n";

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

// Plain words with the active one underlined, like the active tab in the bottom navigation.
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
      className="-mx-1 inline-flex gap-2"
    >
      {supportedLocales.map((locale) => (
        <ToggleGroup.Item
          key={locale}
          value={locale}
          lang={locale}
          className="type-label min-h-11 px-1 text-gray-600 underline-offset-8 transition-colors duration-fast ease-od hover:text-navy-900 data-[state=on]:text-navy-900 data-[state=on]:underline data-[state=on]:decoration-2"
        >
          {t(`language.${locale}`)}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
