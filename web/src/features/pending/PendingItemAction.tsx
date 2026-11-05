import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useMarkNotificationRead, useUploadDocument } from "@/api/hooks/account";
import type { Notification } from "@/api/proposed-types";
import { Button } from "@/components/Button";
import { buttonClass } from "@/components/component-styles";
import { Sheet } from "@/components/Sheet";
import { DocumentUpload } from "@/features/account/DocumentUpload";
import { paths } from "@/routes";
import { TermsAcceptDialog } from "./TermsAcceptDialog";

const actionLink = buttonClass("ghost", "never");

// The one action of each pending item (decision D7).
// `primary`: the screen's one primary action (the first deposit waiting on the client).
export function PendingItemAction({ item, primary }: { item: Notification; primary: boolean }) {
  const { t } = useTranslation("pending");
  const linkClass = primary ? buttonClass("primary") : actionLink;

  switch (item.kind) {
    case "deposit_action":
      // The plan's reminder carries only the plan id: T6 loads the amount from GET /plans.
      if (item.planId) {
        return (
          <Link
            to={`${paths.newDeposit}?plan=${encodeURIComponent(item.planId)}`}
            className={linkClass}
          >
            {t("pending.actions.deposit")}
          </Link>
        );
      }
      return (
        <Link
          to={item.depositId ? paths.depositDetail(item.depositId) : paths.deposit}
          className={linkClass}
        >
          {t("pending.actions.instructions")}
        </Link>
      );
    case "document":
      return <DocumentAction item={item} />;
    case "terms":
      return <TermsAction item={item} />;
    case "notice":
      return <NoticeAction item={item} />;
  }
}

function DocumentAction({ item }: { item: Notification }) {
  const { t } = useTranslation("pending");
  const upload = useUploadDocument();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        fullWidth="never"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("pending.actions.document")}
      </Button>
      {/* The sheet names the action; DocumentUpload names the document. */}
      <Sheet open={open} onOpenChange={setOpen} title={t("pending.actions.document")}>
        <DocumentUpload
          as="div"
          item={item}
          upload={async (file, onProgress) => {
            await upload.mutateAsync({ pendingItemId: item.id, file, onProgress });
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function TermsAction({ item }: { item: Notification }) {
  const { t } = useTranslation("pending");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        fullWidth="never"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("pending.actions.terms")}
      </Button>
      <TermsAcceptDialog termsId={item.termsId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function NoticeAction({ item }: { item: Notification }) {
  const { t } = useTranslation("pending");
  const markRead = useMarkNotificationRead();
  return (
    <Button
      variant="ghost"
      fullWidth="never"
      loading={markRead.isPending}
      onClick={() => {
        markRead.mutate(item.id);
      }}
    >
      {t("pending.actions.notice")}
    </Button>
  );
}
