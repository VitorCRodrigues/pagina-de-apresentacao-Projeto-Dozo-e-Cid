// Contracts for everything outside OpenDollars. Each call carries an idempotency key the provider must honour,
// so the outbox can retry after a crash without moving money twice.
import type { Lane } from "./funding.ts";

export type DepositNotice = { ibkrAccount: string; amountCents: number; currency: "USD"; reference: string; lane: Lane };
export type AllocationOrder = { windowId: string; isin: string; allocations: Record<string, { cents: number; shares?: number }> }; // keyed by IBKR account
export type CollectionInstruction = { depositId: string; amountCents: number; lane: Lane; ibkrAccount: string };

export interface IbkrGateway {
  notifyDeposit(n: DepositNotice, idemKey: string): Promise<void>;
  placeAllocationOrder(o: AllocationOrder, idemKey: string): Promise<void>;
}
export interface PartnerGateway {
  instructCollection(i: CollectionInstruction, idemKey: string): Promise<void>;
}
