import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { AppShell } from "@/components/AppShell";
import { Maintenance } from "@/components/PageState";
import { asLocale } from "@/lib/locale";

function untilFrom(state: unknown): string | undefined {
  if (typeof state !== "object" || state === null || !("until" in state)) return undefined;
  return typeof state.until === "string" ? state.until : undefined;
}

// Reached when the API answers 503 maintenance; `until` comes in the navigation state.
export function MaintenanceScreen() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const until = untilFrom(location.state);

  return (
    <AppShell>
      <Maintenance locale={asLocale(i18n.resolvedLanguage)} {...(until && { until })} />
    </AppShell>
  );
}
