import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/api/types";
import { preferredLocale, readExplicitLocale } from "@/i18n/locale-preference";
import { asLocale } from "@/lib/locale";

// Once the account is known, a device with no explicit choice speaks the account's language.
export function useAccountLocale(account: Locale | undefined): void {
  const { i18n } = useTranslation();
  const browser = asLocale(i18n.resolvedLanguage ?? i18n.language);

  useEffect(() => {
    if (!account) return;
    const next = preferredLocale({ explicit: readExplicitLocale(), account, browser });
    if (next !== browser) void i18n.changeLanguage(next);
    // Applied when the account arrives or changes, never on later language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
}
