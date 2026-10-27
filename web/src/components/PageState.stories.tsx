import type { ReactNode } from "react";
import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Button } from "./Button";
import { EmptyState, ErrorState, LoadingState, Maintenance, SessionExpired } from "./PageState";

const meta = preview.meta({ title: "Domain/PageState", parameters: { frame: false } });

// Page states fill the whole 375 px screen, so they render without the story frame.
function Screen({ children }: { children: ReactNode }) {
  return <div className="w-[375px]">{children}</div>;
}

export const Loading = meta.story({
  render: () => (
    <Screen>
      <LoadingState />
    </Screen>
  ),
});

export const Empty = meta.story({
  render: () => (
    <Screen>
      <EmptyState
        title={i18n.t("demo:empty.title")}
        body={i18n.t("demo:empty.body")}
        action={<Button>{i18n.t("demo:empty.action")}</Button>}
      />
    </Screen>
  ),
});

export const Error = meta.story({
  render: () => (
    <Screen>
      <ErrorState onRetry={() => undefined} />
    </Screen>
  ),
});

export const SessionExpiredState = meta.story({
  name: "Session expired",
  render: () => (
    <Screen>
      <SessionExpired onSignIn={() => undefined} />
    </Screen>
  ),
});

export const MaintenanceState = meta.story({
  name: "Maintenance",
  render: (_args, { globals }) => (
    <Screen>
      <Maintenance locale={storyLocale(globals)} until="2026-10-27T21:00:00Z" />
    </Screen>
  ),
});
