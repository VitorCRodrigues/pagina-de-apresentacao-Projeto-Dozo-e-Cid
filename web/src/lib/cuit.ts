// CUIT/CUIL (Argentina): 2-digit type, 8-digit number, 1 check digit.
// The pilot opens accounts for individuals only, so company prefixes (30, 33, 34) are rejected.
const PERSON_PREFIXES = new Set(["20", "23", "24", "25", "26", "27"]);
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

// Drops dashes and spaces only; any other character makes the value invalid.
export function normalizeCuit(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function isValidCuit(value: string): boolean {
  const digits = normalizeCuit(value);
  if (!/^\d{11}$/.test(digits) || !PERSON_PREFIXES.has(digits.slice(0, 2))) return false;

  const sum = WEIGHTS.reduce((total, weight, i) => total + weight * Number(digits[i]), 0);
  const check = 11 - (sum % 11);
  if (check === 10) return false;
  return (check === 11 ? 0 : check) === Number(digits[10]);
}

export function formatCuit(value: string): string {
  const digits = normalizeCuit(value);
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}
