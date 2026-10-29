import { createContext } from "react";
import type { Locale } from "@/api/types";

export type IdentityResult =
  { status: "approved"; reference: string } | { status: "failed"; reason: "cancelled" | "error" };

// The seam for the identity vendor (PRD T2: document photo and liveness).
// TODO(decisão): Sumsub, Persona or Onfido. Its SDK goes behind this interface; nothing else
// in the app talks to the vendor.
export interface IdentityProvider {
  // Mounts the vendor flow and returns a cleanup. After the cleanup, onResult is never called.
  start(options: { locale: Locale; onResult: (result: IdentityResult) => void }): () => void;
}

// Approves after `delayMs`, as the PRD asks of the mock.
export function createMockIdentityProvider(delayMs = 2000): IdentityProvider {
  return {
    start({ onResult }) {
      const timer = setTimeout(() => {
        onResult({ status: "approved", reference: `mock-idv-${String(Date.now())}` });
      }, delayMs);
      return () => {
        clearTimeout(timer);
      };
    },
  };
}

export const IdentityProviderContext = createContext<IdentityProvider>(
  createMockIdentityProvider(),
);
