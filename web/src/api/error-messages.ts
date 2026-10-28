import { isApiError, type ClientErrorCode } from "./errors";
import type { BlockReason } from "./types";

// i18n keys for codes the API sends. The UI translates by code, never by message.
// TODO(compliance): error and block copy pending legal review (PRD section 10).

// Any thrown value; unknown errors read as "internal".
export function errorMessageKey(error: unknown): `errors.${ClientErrorCode}` {
  return isApiError(error) ? `errors.${error.code}` : "errors.internal";
}

// PRD section 5 block table: what the client reads and the action offered.
// compliance_hold never says why (PRD: "não revelar o motivo").
export function blockMessageKeys(reason: BlockReason) {
  return {
    message: `blockReason.${reason}.message`,
    action: `blockReason.${reason}.action`,
  } as const;
}
