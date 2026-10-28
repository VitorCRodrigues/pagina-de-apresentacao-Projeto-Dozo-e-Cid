import { useCallback, useState } from "react";

export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

// One key per intention, not per click (PRD section 8): the key lives in the flow's state and
// stays the same while the intent (quote, rail, amount) is the same, so a double click or a
// retry after a timeout resends it. It changes when the intent changes or after reset(),
// which the flow calls once the deposit was created.
export function useIdempotencyKey(intent: unknown): { key: string; reset: () => void } {
  const serialized = JSON.stringify(intent);
  const [state, setState] = useState(() => ({ intent: serialized, key: createIdempotencyKey() }));

  const reset = useCallback(() => {
    setState((current) => ({ intent: current.intent, key: createIdempotencyKey() }));
  }, []);

  // A different intent: adjust the state during render (React's pattern for derived state).
  if (state.intent !== serialized) {
    const next = { intent: serialized, key: createIdempotencyKey() };
    setState(next);
    return { key: next.key, reset };
  }

  return { key: state.key, reset };
}
