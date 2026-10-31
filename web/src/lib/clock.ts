// How far the device clock is from the server's, from the Date header of a response. The
// header has whole seconds, so differences under one second are noise. The server's
// 409 quote_expired stays the final word; this only keeps the countdown honest.
export function clockOffset(dateHeader: string | null, receivedAt: number): number {
  if (!dateHeader) return 0;
  const server = Date.parse(dateHeader);
  if (Number.isNaN(server)) return 0;
  const offset = server - receivedAt;
  return Math.abs(offset) < 1000 ? 0 : offset;
}
