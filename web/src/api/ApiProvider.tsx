import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { asLocale } from "@/lib/locale";
import type { Locale } from "./types";
import { ApiContext } from "./api-context";
import { useAuth } from "./auth-context";
import { createApiClient } from "./client";

function localeSource(initial: Locale) {
  let current = initial;
  return {
    get: () => current,
    set: (next: Locale) => {
      current = next;
    },
  };
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const { status, getAccessToken } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Set from the languageChanged event itself: when it fires, i18n.resolvedLanguage can still
  // hold the previous language, and the refetch below would ask for it again.
  const [locale] = useState(() => localeSource(asLocale(i18n.resolvedLanguage ?? i18n.language)));

  const client = useMemo(
    () => createApiClient({ getToken: getAccessToken, getLocale: locale.get }),
    [getAccessToken, locale],
  );

  // Editorial content comes translated from the API (decisions.md, item 12): refetch it.
  useEffect(() => {
    const refetchInNewLanguage = (language: string) => {
      locale.set(asLocale(language));
      void queryClient.invalidateQueries();
    };
    i18n.on("languageChanged", refetchInNewLanguage);
    return () => {
      i18n.off("languageChanged", refetchInNewLanguage);
    };
  }, [i18n, queryClient, locale]);

  // No personal data stays in the cache after the session ends.
  useEffect(() => {
    if (status === "signedOut") queryClient.removeQueries({ queryKey: ["session"] });
  }, [status, queryClient]);

  return <ApiContext value={client}>{children}</ApiContext>;
}
