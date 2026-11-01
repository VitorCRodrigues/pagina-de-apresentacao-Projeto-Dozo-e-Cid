import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/api/error-messages";
import { useSentNotice } from "@/api/hooks/deposits";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

// "Ya envié": a secondary action that only tells support. The state moves when the money
// arrives, never because of this button.
export function SentNotice({ depositId }: { depositId: string }) {
  const { t } = useTranslation("deposit");
  const notice = useSentNotice(depositId);
  const sent = useRef(false);

  if (notice.isSuccess) {
    return <Banner tone="info" quiet title={t("deposit.instructions.sent.done")} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        loading={notice.isPending}
        onClick={() => {
          // One notice per deposit, whatever the number of taps.
          if (sent.current) return;
          sent.current = true;
          notice.mutate(undefined, {
            onError: () => {
              sent.current = false;
            },
          });
        }}
      >
        {t("deposit.instructions.sent.action")}
      </Button>
      <p className="type-caption text-gray-600">{t("deposit.instructions.sent.help")}</p>
      {notice.isError && <Banner tone="error" title={t(errorMessageKey(notice.error))} />}
    </div>
  );
}
