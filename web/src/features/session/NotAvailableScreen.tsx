import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import type { Me } from "@/api/types";
import { Button } from "@/components/Button";
import { paths } from "@/routes";
import { WaitlistForm } from "./WaitlistForm";

// T1, country outside config.liveMarkets: waitlist with the email only.
export function NotAvailableScreen({ me }: { me: Me }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <section className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3">
        <h1 className="type-title text-navy-900">{t("waitlist.title")}</h1>
        <p className="type-body text-gray-600">{t("waitlist.body")}</p>
      </div>

      <WaitlistForm defaultEmail={me.email} country={me.country} />

      <Button
        variant="ghost"
        fullWidth="never"
        className="self-start"
        onClick={() => {
          void logout();
          void navigate(paths.entry, { replace: true });
        }}
      >
        {t("waitlist.signOut")}
      </Button>
    </section>
  );
}
