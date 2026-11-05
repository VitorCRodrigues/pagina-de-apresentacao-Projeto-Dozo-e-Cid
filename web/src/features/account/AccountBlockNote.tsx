import { useTranslation } from "react-i18next";
import { blockMessageKeys } from "@/api/error-messages";
import type { Account } from "@/api/types";
import { Banner } from "@/components/Banner";
import { buttonClass } from "@/components/component-styles";
import { accountBlock } from "@/features/deposits/rules";
import { SUPPORT_EMAIL } from "@/lib/support";

// Decision 14: a restricted account keeps the navigation; Início, Plan and Perfil say why
// deposits stop and offer support. Nothing when the account has no block.
export function AccountBlockNote({ account }: { account: Account }) {
  const { t } = useTranslation();
  const block = accountBlock(account);
  if (!block) return null;
  const keys = blockMessageKeys(block.reason);
  return (
    <Banner
      tone="warning"
      title={t(keys.message)}
      {...(block.action === "support" && {
        action: (
          <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("ghost", "never")}>
            {t(keys.action)}
          </a>
        ),
      })}
    />
  );
}
