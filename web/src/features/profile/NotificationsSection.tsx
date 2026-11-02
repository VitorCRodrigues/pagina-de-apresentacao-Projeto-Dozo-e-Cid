import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/api/hooks/account";
import type { NotificationPrefs } from "@/api/proposed-types";
import { Banner } from "@/components/Banner";
import { Checkbox } from "@/components/Checkbox";
import { InlineError, InlineLoading } from "@/components/PageState";
import { prefsPatch } from "./notification-prefs";

// TODO(decisão): push needs a PWA or a native app. Today this only saves the preference; it asks
// the browser for no permission.
export function NotificationsSection() {
  const { t } = useTranslation("profile");
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  // Its own state: update.isError only knows the latest toggle.
  const [failed, setFailed] = useState(false);

  const toggle = (current: NotificationPrefs, field: keyof NotificationPrefs, checked: boolean) => {
    const patch = prefsPatch(current, field, checked);
    if (!patch) return;
    setFailed(false);
    update.mutateAsync(patch).catch(() => {
      setFailed(true);
    });
  };

  let body;
  if (prefs.data) {
    const current = prefs.data;
    body = (
      <>
        <Checkbox
          label={t("profile.notifications.email")}
          checked={current.email}
          onCheckedChange={(checked) => {
            toggle(current, "email", checked);
          }}
        />
        <Checkbox
          label={t("profile.notifications.push")}
          description={t("profile.notifications.pushNote")}
          checked={current.push}
          onCheckedChange={(checked) => {
            toggle(current, "push", checked);
          }}
        />
        {failed && <Banner tone="error" title={t("profile.notifications.failed")} />}
      </>
    );
  } else if (prefs.isError) {
    body = <InlineError onRetry={() => void prefs.refetch()} />;
  } else {
    body = <InlineLoading />;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="type-label text-graphite-900">{t("profile.notifications.title")}</h3>
      {body}
    </div>
  );
}
