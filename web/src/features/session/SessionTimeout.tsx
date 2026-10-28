import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { Dialog } from "@/components/Dialog";
import { paths } from "@/routes";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS, useIdleTimeout } from "./useIdleTimeout";

interface SessionTimeoutProps {
  timeoutMs?: number;
  warningMs?: number;
}

// Warns 60 s before the 15-minute inactivity limit; on expiry, ends the session.
export function SessionTimeout({
  timeoutMs = SESSION_TIMEOUT_MS,
  warningMs = SESSION_WARNING_MS,
}: SessionTimeoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const onTimeout = useCallback(() => {
    void navigate(paths.sessionExpired, { replace: true });
  }, [navigate]);

  const { deadline, stayActive } = useIdleTimeout({ timeoutMs, warningMs, onTimeout });

  return (
    <Dialog
      open={deadline !== null}
      onOpenChange={(open) => {
        // Closing the dialog (Escape, X) counts as staying.
        if (!open) stayActive();
      }}
      title={t("session.timeout.title")}
      description={t("session.timeout.body")}
      footer={
        <>
          <Button fullWidth="always" onClick={stayActive}>
            {t("session.timeout.stay")}
          </Button>
          <Button
            variant="ghost"
            fullWidth="always"
            onClick={() => {
              void logout();
              void navigate(paths.entry, { replace: true });
            }}
          >
            {t("session.timeout.signOut")}
          </Button>
        </>
      }
    >
      {deadline !== null && (
        <Countdown
          expiresAt={new Date(deadline).toISOString()}
          label={t("session.timeout.countdownLabel")}
        />
      )}
    </Dialog>
  );
}
