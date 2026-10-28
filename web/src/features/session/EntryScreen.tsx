import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Wordmark } from "@/components/Wordmark";
import { paths } from "@/routes";

// T1. Left-aligned like a statement: what the product is, a rule, then where the money lives.
// TODO(compliance): headline and pilot line pending legal review (PRD section 10).
export function EntryScreen() {
  const { t } = useTranslation();
  const { status, login } = useAuth();
  const [failed, setFailed] = useState(false);

  if (status === "signedIn") return <Navigate to={paths.home} replace />;

  async function signIn() {
    setFailed(false);
    try {
      await login();
    } catch {
      setFailed(true);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Wordmark size="lg" />

      <div className="flex flex-1 flex-col justify-center gap-8 py-14">
        <h1 className="type-display text-navy-900">{t("entry.headline")}</h1>
        <p className="type-body max-w-[34ch] border-t border-graphite-900 pt-4 text-graphite-900">
          {t("entry.custody")}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {failed && <Banner tone="error" title={t("entry.signInError")} />}
        <LanguageSwitcher />
        <Button fullWidth="always" loading={status === "signingIn"} onClick={() => void signIn()}>
          {t("entry.signIn")}
        </Button>
        <p className="type-caption text-gray-600">
          {t("entry.pilot")} {/* TODO(compliance): link to the terms once the text exists. */}
          <a href="#terms" className="text-green-700 underline underline-offset-4">
            {t("entry.terms")}
          </a>
        </p>
      </div>
    </main>
  );
}
