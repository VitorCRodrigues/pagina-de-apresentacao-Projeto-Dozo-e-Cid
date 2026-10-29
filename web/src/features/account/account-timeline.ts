import type { TimelineStatus } from "@/components/Timeline";
import type { AccountStatus } from "@/api/types";

const openingSteps = ["submitted", "kyc_review", "ibkr_pending", "open"] as const;
type OpeningStep = (typeof openingSteps)[number];

export interface AccountTimelineStep {
  id: OpeningStep;
  status: TimelineStatus;
  labelKey: `account.timeline.${OpeningStep}`;
  noteKey?: "account.timeline.actionNote";
}

// Where each status sits on the opening path. action_required mirrors a request from
// Interactive Brokers, so it sits on their step as the current one, not as an error (D9).
const position: Partial<Record<AccountStatus, OpeningStep>> = {
  submitted: "submitted",
  kyc_review: "kyc_review",
  ibkr_pending: "ibkr_pending",
  action_required: "ibkr_pending",
  open: "open",
};

// T3. null when the opening path does not apply: an unfinished draft, or a rejected or
// restricted account (neutral text, no timeline).
export function accountTimeline(status: AccountStatus): AccountTimelineStep[] | null {
  const at = position[status];
  if (!at) return null;
  const current = openingSteps.indexOf(at);

  return openingSteps.map((id, index) => {
    const done = index < current || status === "open";
    const step: AccountTimelineStep = {
      id,
      status: done ? "done" : index === current ? "current" : "upcoming",
      labelKey: `account.timeline.${id}`,
    };
    if (status === "action_required" && index === current) {
      step.noteKey = "account.timeline.actionNote";
    }
    return step;
  });
}
