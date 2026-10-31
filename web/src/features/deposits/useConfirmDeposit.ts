import { useCallback, useRef } from "react";
import { useCreateDeposit } from "@/api/hooks/deposits";
import { useIdempotencyKey } from "@/api/idempotency";
import type { DepositDetail } from "@/api/proposed-types";
import type { Quote, Rail } from "@/api/types";

export type ConfirmOutcome = { deposit: DepositDetail } | { error: unknown };

// Confirms the chosen quote and rail with one Idempotency-Key per intention: a double click
// sends a single POST, a retry after a network error resends the same key, and a new quote
// or rail is a new intention with a new key (PRD section 8).
export function useConfirmDeposit(quote: Quote | null, rail: Rail | null) {
  const create = useCreateDeposit();
  const { key, reset } = useIdempotencyKey({ quoteId: quote?.id ?? null, rail });
  // Held from the click until the request settles, and for good once a deposit exists: the
  // screen navigates away, and a click in between must not start a second deposit.
  const locked = useRef(false);
  const { mutateAsync } = create;

  // null when nothing was sent (no quote, or a request already running or done).
  const confirm = useCallback(async (): Promise<ConfirmOutcome | null> => {
    if (!quote || !rail || locked.current) return null;
    locked.current = true;
    try {
      const deposit = await mutateAsync({ body: { quoteId: quote.id, rail }, idempotencyKey: key });
      reset();
      return { deposit };
    } catch (error) {
      locked.current = false; // a retry may resend the same key
      return { error };
    }
  }, [quote, rail, key, reset, mutateAsync]);

  return { confirm, pending: create.isPending, error: create.error };
}
