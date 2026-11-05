import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/api/error-messages";
import { useAcceptTerms, useTermsDocuments } from "@/api/hooks/account";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Dialog } from "@/components/Dialog";
import { Skeleton } from "@/components/Skeleton";
import { formatVersion } from "@/lib/dates";
import { asLocale } from "@/lib/locale";

interface TermsAcceptDialogProps {
  // Without one (an item from account.pending), the first document not yet accepted.
  termsId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// New terms are never accepted with one tap: the document opens first, then an explicit,
// unticked box, then "Aceptar". It saves { id, version, acceptedAt } like onboarding step 7,
// with acceptedAt the moment the box was ticked.
export function TermsAcceptDialog({ termsId, open, onOpenChange }: TermsAcceptDialogProps) {
  const { t, i18n } = useTranslation("pending");
  const terms = useTermsDocuments();
  const accept = useAcceptTerms();
  const [viewed, setViewed] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const doc = terms.data?.find((d) => (termsId ? d.id === termsId : d.acceptedAt === undefined));

  const close = (next: boolean) => {
    if (!next) {
      setViewed(false);
      setAcceptedAt(null);
      accept.reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={doc?.title ?? t("pending.actions.terms")}
      footer={
        <>
          <Button
            disabled={!doc || !viewed || acceptedAt === null}
            loading={accept.isPending}
            onClick={() => {
              if (!doc || !viewed || acceptedAt === null) return;
              accept.mutate(
                { id: doc.id, version: doc.version, acceptedAt },
                {
                  onSuccess: () => {
                    close(false);
                  },
                },
              );
            }}
          >
            {t("pending.terms.confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              close(false);
            }}
          >
            {t("pending.terms.back")}
          </Button>
        </>
      }
    >
      {terms.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : !doc ? (
        <p className="type-body text-graphite-900">{t("pending.terms.missing")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* TODO(compliance): drafts until legal signs the final texts. */}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setViewed(true);
            }}
            className="type-label self-start text-green-700 underline underline-offset-4"
          >
            {t("pending.terms.read", {
              version: formatVersion(doc.version, asLocale(i18n.language)),
            })}
          </a>
          {!viewed && <p className="type-caption text-gray-600">{t("pending.terms.readFirst")}</p>}
          <Checkbox
            label={t("pending.terms.accept", { title: doc.title })}
            checked={acceptedAt !== null}
            disabled={!viewed}
            onCheckedChange={(checked) => {
              setAcceptedAt(checked ? new Date().toISOString() : null);
            }}
          />
          {accept.error != null && <Banner tone="error" title={t(errorMessageKey(accept.error))} />}
        </div>
      )}
    </Dialog>
  );
}
