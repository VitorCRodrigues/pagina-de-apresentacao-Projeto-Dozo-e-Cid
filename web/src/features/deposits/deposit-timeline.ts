import type { DepositDetail } from "@/api/proposed-types";
import type { DepositState } from "@/api/types";
import type { TimelineStatus } from "@/components/Timeline";

export interface DepositTimelineStep {
  state: DepositState;
  labelKey: `deposit.state.${DepositState}` | "deposit.state.partner_collected_usdc";
  status: TimelineStatus;
  at?: string;
}

// funding.ts order (PRD section 6). The account steps come first and only as context.
const accountSteps: readonly DepositState[] = ["kyc_passed", "ibkr_open"];
const depositSteps: readonly DepositState[] = [
  "deposit_notified",
  "partner_collected",
  "fx_executed",
  "wire_sent",
  "broker_credited",
  "invested",
];
const order = [...accountSteps, ...depositSteps];

// USDC has no exchange and no wire: those steps are a known backend artefact (PRD section 6).
const hiddenFor = (deposit: DepositDetail): ReadonlySet<DepositState> =>
  new Set(deposit.rail === "ar_usdc" ? ["fx_executed", "wire_sent"] : []);

// The friendly name of a state. USDC has no exchange: partner_collected reads "USDC recibido".
export function stateLabelKey({
  rail,
  state,
}: Pick<DepositDetail, "rail" | "state">): DepositTimelineStep["labelKey"] {
  return rail === "ar_usdc" && state === "partner_collected"
    ? "deposit.state.partner_collected_usdc"
    : `deposit.state.${state}`;
}

// T8. Friendly steps for a deposit, by rail. Never depends on the hidden states existing.
export function depositTimeline(deposit: DepositDetail): DepositTimelineStep[] {
  const hidden = hiddenFor(deposit);
  const visible = [...(deposit.isFirstDeposit ? accountSteps : []), ...depositSteps].filter(
    (state) => !hidden.has(state),
  );
  const timeOf = (state: DepositState) =>
    deposit.history.findLast((event) => event.state === state)?.at;
  const label = (state: DepositState) => stateLabelKey({ rail: deposit.rail, state });

  // The furthest state reached on the path; returned keeps the one it came from.
  const returned = deposit.state === "returned";
  const reachedStates = deposit.history.map((event) => event.state).filter((s) => s !== "returned");
  const furthest = Math.max(
    order.indexOf("deposit_notified"),
    ...reachedStates.map((state) => order.indexOf(state)),
    returned ? -1 : order.indexOf(deposit.state),
  );
  // Stuck in a hidden state: the last visible step reached is the current one.
  const current = visible.findLast((state) => order.indexOf(state) <= furthest);
  const allDone = deposit.state === "invested";

  const steps = visible
    .filter((state) => !returned || order.indexOf(state) <= furthest)
    .map((state): DepositTimelineStep => {
      const position = order.indexOf(state);
      const isContext = accountSteps.includes(state);
      const status: TimelineStatus =
        allDone ||
        isContext ||
        position < order.indexOf(current ?? state) ||
        (returned && position <= furthest)
          ? "done"
          : state === current
            ? "current"
            : "upcoming";
      const at = timeOf(state);
      return { state, labelKey: label(state), status, ...(at && { at }) };
    });

  if (returned) {
    const at = timeOf("returned");
    steps.push({
      state: "returned",
      labelKey: label("returned"),
      status: "error",
      ...(at && { at }),
    });
  }
  return steps;
}
