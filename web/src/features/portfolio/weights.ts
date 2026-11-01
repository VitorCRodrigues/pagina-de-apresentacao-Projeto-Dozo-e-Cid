// Position.weight and targetWeight are ratios from the API (0.6 = 60%), display only.
// They become integer basis points; the bar is clamped to its track, the text keeps the value.

export interface WeightComparison {
  currentBp: number;
  targetBp: number;
  // Bar fill and target marker, 0–10000.
  barBp: number;
  markerBp: number;
}

const FULL = 10000;

function toBasisPoints(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  // toFixed absorbs binary noise (0.58125 × 10000 = 5812.499…) before rounding half up.
  return Math.round(Number((ratio * FULL).toFixed(6)));
}

const clamp = (bp: number) => Math.min(FULL, Math.max(0, bp));

export function weightComparison(weight: number, targetWeight: number): WeightComparison {
  const currentBp = toBasisPoints(weight);
  const targetBp = toBasisPoints(targetWeight);
  return { currentBp, targetBp, barBp: clamp(currentBp), markerBp: clamp(targetBp) };
}
