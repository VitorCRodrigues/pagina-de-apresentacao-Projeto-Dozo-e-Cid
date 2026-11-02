import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { paths } from "@/routes";

// A simple confirmation, then out. ApiProvider clears the session data as the status changes,
// and the local session ends even if the provider cannot be reached.
export function LogoutAction() {
  const { t } = useTranslation("profile");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        fullWidth="never"
        className="-ml-1 self-start"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("profile.logout.action")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t("profile.logout.title")}
        footer={
          <>
            <Button
              onClick={() => {
                void logout().catch(() => undefined);
                void navigate(paths.entry, { replace: true });
              }}
            >
              {t("profile.logout.confirm")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t("profile.logout.back")}
            </Button>
          </>
        }
      />
    </>
  );
}
