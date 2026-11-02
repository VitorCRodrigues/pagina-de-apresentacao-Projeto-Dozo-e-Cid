// Which language the app speaks: a choice made on this device > the account's language
// (GET /me) > the browser's. Only the explicit choice is stored here; it is a UI preference,
// not personal data. Storage can be blocked: then the choice lasts until the page reloads.
export const supportedLocales = ["es", "pt", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

// Not the old "od.locale", where the language detector cached what it detected on every visit.
export const LOCALE_KEY = "od.locale.choice";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (supportedLocales as readonly unknown[]).includes(value);
}

export function readExplicitLocale(): SupportedLocale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveExplicitLocale(locale: SupportedLocale | null): void {
  try {
    if (locale) window.localStorage.setItem(LOCALE_KEY, locale);
    else window.localStorage.removeItem(LOCALE_KEY);
  } catch {
    // Blocked storage: the language still changes for this visit.
  }
}

export function preferredLocale({
  explicit,
  account,
  browser,
}: {
  explicit: SupportedLocale | null;
  account: SupportedLocale | undefined;
  browser: SupportedLocale;
}): SupportedLocale {
  return explicit ?? account ?? browser;
}
