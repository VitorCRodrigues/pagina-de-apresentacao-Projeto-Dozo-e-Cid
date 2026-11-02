import { useTranslation } from "react-i18next";
import { useUpdateMe } from "@/api/hooks/account";
import { Banner } from "@/components/Banner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// The choice applies on this device at once and is saved on the account; if the account refuses
// it, the previous language comes back.
export function LanguageSection() {
  const { t } = useTranslation("profile");
  const update = useUpdateMe();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="type-label text-graphite-900">{t("profile.language.title")}</h3>
      <LanguageSwitcher
        onSelect={(locale, undo) => {
          // Not mutate's onError: it is skipped once this screen has unmounted.
          update.mutateAsync({ locale }).catch(undo);
        }}
      />
      {update.isError && <Banner tone="error" title={t("profile.language.failed")} />}
    </div>
  );
}
