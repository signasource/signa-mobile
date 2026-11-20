import { useEffect, useState } from "react";
import { serverNow } from "@/utils/serverClock";

function secondsUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - serverNow()) / 1000));
}

/** Seconds left until `expiresAt` (ISO string), ticking every second; 0 when unset or past. */
export function useSecondsLeft(expiresAt: string | null | undefined): number {
  const [secs, setSecs] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setSecs(secondsUntil(expiresAt));
    if (!expiresAt) return;
    const tick = setInterval(() => {
      const left = secondsUntil(expiresAt);
      setSecs(left);
      if (left <= 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt]);

  return secs;
}

/** `m:ss`, or `h:mm:ss` from one hour up. */
export function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
