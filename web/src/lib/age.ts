// Minimum age check for onboarding (PRD T2: 18 years). `birthDate` is YYYY-MM-DD, as a date
// input gives it; it is compared by calendar date in the local time zone, never as an instant.
export function isAtLeastAge(birthDate: string, minAge = 18, today: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];

  // Reject dates that do not exist (2008-13-01, 2007-02-30).
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return false;
  }

  // Birthday in the target year; a 29 February rolls over to 1 March in common years.
  const comesOfAge = new Date(year + minAge, month - 1, day);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return comesOfAge <= todayDate;
}
