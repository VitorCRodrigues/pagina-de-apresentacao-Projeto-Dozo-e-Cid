import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { asLocale } from "@/lib/locale";
import type { IdentityProvider, IdentityResult } from "./identity-provider";

type Phase = "idle" | "running" | "approved" | "failed";

interface IdentityVerificationProps {
  provider: IdentityProvider;
  onResult: (result: IdentityResult) => void;
  // A draft that already holds an approval opens in the approved state.
  approved?: boolean;
}

// Our own interface around the vendor flow: what the client needs, the check running, and
// the outcome. The vendor SDK only ever sees `provider.start`.
export function IdentityVerification({
  provider,
  onResult,
  approved = false,
}: IdentityVerificationProps) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<Phase>(approved ? "approved" : "idle");
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanup.current?.();
    },
    [],
  );

  function start() {
    cleanup.current?.();
    setPhase("running");
    cleanup.current = provider.start({
      locale: asLocale(i18n.language),
      onResult: (result) => {
        cleanup.current = null;
        setPhase(result.status === "approved" ? "approved" : "failed");
        onResult(result);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 border-y border-gray-200 py-5">
      <div aria-live="polite" className="flex flex-col gap-1">
        {phase === "idle" && (
          <p className="type-body text-graphite-900">{t("onboarding.identity.need")}</p>
        )}
        {phase === "running" && (
          <p className="type-body text-gray-600">{t("onboarding.identity.running")}</p>
        )}
        {phase === "approved" && (
          <p className="type-label flex items-center gap-2 text-green-700">
            <Icon icon={Check} size={16} />
            {t("onboarding.identity.approved")}
          </p>
        )}
        {phase === "failed" && (
          <p className="type-label text-brick-700">{t("onboarding.identity.failed")}</p>
        )}
      </div>
      {phase === "idle" && (
        <Button variant="secondary" onClick={start} className="self-start">
          {t("onboarding.identity.start")}
        </Button>
      )}
      {phase === "failed" && (
        <Button variant="secondary" onClick={start} className="self-start">
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
