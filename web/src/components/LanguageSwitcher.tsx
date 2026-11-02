import { ToggleGroup } from "radix-ui";
import { useTranslation } from "react-i18next";
import {
  isSupportedLocale,
  readExplicitLocale,
  saveExplicitLocale,
  supportedLocales,
  type SupportedLocale,
} from "@/i18n/locale-preference";

interface LanguageSwitcherProps {
  // Told of the client's choice, with a way to take it back (the Profile saves it on the account
  // and undoes it if that fails).
  onSelect?: (locale: SupportedLocale, undo: () => void) => void;
}

// Plain words with the active one underlined, like the active tab in the bottom navigation.
export function LanguageSwitcher({ onSelect }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();

  return (
    <ToggleGroup.Root
      type="single"
      value={i18n.resolvedLanguage}
      onValueChange={(value) => {
        // Radix sends "" when the active item is clicked again; keep the current locale.
        if (!isSupportedLocale(value)) return;
        const previous = i18n.resolvedLanguage;
        const previousExplicit = readExplicitLocale();
        saveExplicitLocale(value);
        void i18n.changeLanguage(value);
        onSelect?.(value, () => {
          // A later choice stands: only the language that failed goes back.
          if (readExplicitLocale() !== value) return;
          saveExplicitLocale(previousExplicit);
          if (previous) void i18n.changeLanguage(previous);
        });
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
