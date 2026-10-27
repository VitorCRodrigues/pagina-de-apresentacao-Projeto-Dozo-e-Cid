// Approved text/background pairings and their WCAG 2.1 minimums.
// 4.5 = normal text, 3 = large text (>= 24 px, or >= 18.66 px bold) and UI component boundaries.
export interface ContrastPair {
  fg: string;
  bg: string;
  min: 3 | 4.5;
  use: string;
}

export const contrastPairs: readonly ContrastPair[] = [
  { fg: "graphite-900", bg: "cream-50", min: 4.5, use: "Body text" },
  { fg: "graphite-900", bg: "paper", min: 4.5, use: "Body text on cards" },
  { fg: "navy-900", bg: "cream-50", min: 4.5, use: "Titles, secondary button" },
  { fg: "gray-600", bg: "cream-50", min: 4.5, use: "Secondary text, placeholder" },
  { fg: "gray-600", bg: "paper", min: 4.5, use: "Secondary text on cards" },
  { fg: "gray-600", bg: "gray-50", min: 4.5, use: "Neutral badge" },
  { fg: "gray-500", bg: "cream-50", min: 3, use: "Input border (non-text)" },
  { fg: "gray-500", bg: "paper", min: 3, use: "Input border on cards (non-text)" },
  { fg: "green-700", bg: "cream-50", min: 4.5, use: "Links, done, invested" },
  { fg: "green-700", bg: "paper", min: 4.5, use: "Links on cards" },
  { fg: "green-700", bg: "green-50", min: 4.5, use: "Success badge" },
  { fg: "amber-700", bg: "cream-50", min: 4.5, use: "Warning text" },
  { fg: "amber-700", bg: "amber-50", min: 4.5, use: "Warning banner and badge" },
  { fg: "brick-700", bg: "cream-50", min: 4.5, use: "Error text, returned" },
  { fg: "brick-700", bg: "paper", min: 4.5, use: "Field error on cards" },
  { fg: "brick-700", bg: "brick-50", min: 4.5, use: "Error banner and badge" },
  { fg: "navy-900", bg: "navy-50", min: 4.5, use: "Info banner and badge" },
  { fg: "cream-50", bg: "navy-900", min: 4.5, use: "Primary button, inverse card" },
  { fg: "cream-50", bg: "navy-800", min: 4.5, use: "Primary button hover" },
  { fg: "gold-500", bg: "navy-900", min: 4.5, use: "Total value on inverse card" },
  { fg: "white", bg: "brick-700", min: 4.5, use: "Destructive button" },
  { fg: "navy-900", bg: "cream-50", min: 3, use: "Focus ring (non-text)" },
];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

export function parseColorTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/--od-([a-z]+(?:-\d+)?):\s*(#[0-9a-f]{6})/gi)) {
    const [, name, hex] = match;
    if (name && hex) tokens.set(name, hex.toLowerCase());
  }
  return tokens;
}
