/**
 * Offset between the server's clock and the phone's. Every lives/booster countdown is an
 * instant the *server* computed (`nextLifeAt`, `*ExpiresAt`), so comparing it against a phone
 * clock that is minutes off would make the timer disagree with the real lives.
 */
let offsetMs = 0;

/** Learns the offset from an HTTP `Date` header (1 s resolution, so we add the lost half second). */
export function syncServerClock(dateHeader: unknown): void {
  if (typeof dateHeader !== "string") return;
  const server = Date.parse(dateHeader);
  if (Number.isNaN(server)) return;
  offsetMs = server + 500 - Date.now();
}

/** Current time on the server's clock, in ms. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
