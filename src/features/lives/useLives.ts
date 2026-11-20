import { useEffect, useState } from "react";
import { formatCountdown } from "@/hooks/useSecondsLeft";
import { serverNow } from "@/utils/serverClock";

export const MAX_LIVES = 5;
/** Mirrors `UserStats.LIFE_REGEN_MINUTES` in signa-api. */
export const LIFE_REGEN_MS = 10 * 60 * 1000;

/** The slice of `/inventories/me` that drives every lives placeholder. */
export interface LivesSource {
  livesMode: "INFINITE" | "LIMITED";
  currentLives: number | null;
  nextLifeAt: string | null;
  unlimitedLivesExpiresAt: string | null;
}

export interface LivesState {
  /** False until the first inventory arrives. */
  ready: boolean;
  unlimited: boolean;
  /** Seconds of unlimited lives left (0 when it has no expiry). */
  unlimitedSecs: number;
  lives: number;
  max: number;
  full: boolean;
  /** Seconds until the next life comes back; null when the bar is full or lives are unlimited. */
  nextLifeSecs: number | null;
}

export function livesAt(src: LivesSource | null | undefined, now: number): LivesState {
  if (!src) {
    return { ready: false, unlimited: false, unlimitedSecs: 0, lives: MAX_LIVES, max: MAX_LIVES, full: true, nextLifeSecs: null };
  }
  const expires = src.unlimitedLivesExpiresAt ? new Date(src.unlimitedLivesExpiresAt).getTime() : null;
  const unlimitedSecs = expires != null ? Math.max(0, Math.ceil((expires - now) / 1000)) : 0;
  const unlimited = src.livesMode === "INFINITE" && (expires == null || unlimitedSecs > 0);
  if (unlimited) {
    return { ready: true, unlimited, unlimitedSecs, lives: MAX_LIVES, max: MAX_LIVES, full: true, nextLifeSecs: null };
  }

  // Same rule as the backend: one life per elapsed interval since `nextLifeAt`.
  let lives = Math.min(src.currentLives ?? MAX_LIVES, MAX_LIVES);
  let next = src.nextLifeAt ? new Date(src.nextLifeAt).getTime() : now + LIFE_REGEN_MS;
  while (lives < MAX_LIVES && next <= now) {
    lives += 1;
    next += LIFE_REGEN_MS;
  }
  const full = lives >= MAX_LIVES;
  return {
    ready: true,
    unlimited,
    unlimitedSecs: 0,
    lives,
    max: MAX_LIVES,
    full,
    nextLifeSecs: full ? null : Math.max(0, Math.ceil((next - now) / 1000)),
  };
}

/** Live view of the lives bar: ticks each second while a timer (regeneration or unlimited) runs. */
export function useLives(src: LivesSource | null | undefined): LivesState {
  const [now, setNow] = useState(() => serverNow());
  const state = livesAt(src, now);
  const ticking = state.unlimited ? state.unlimitedSecs > 0 : state.nextLifeSecs != null;

  useEffect(() => {
    setNow(serverNow());
    if (!ticking) return;
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, [ticking, src]);

  return state;
}

/** Header value: `∞` while unlimited, `3/5` otherwise, a dash until the inventory loads. */
export function livesValue(s: LivesState): string {
  if (!s.ready) return "–";
  return s.unlimited ? "∞" : `${s.lives}/${s.max}`;
}

/** Small line under the value: time left of unlimited lives, or until the next life. */
export function livesCaption(s: LivesState): string | undefined {
  if (!s.ready) return undefined;
  if (s.unlimited) return s.unlimitedSecs > 0 ? `${formatCountdown(s.unlimitedSecs)} restantes` : undefined;
  return s.nextLifeSecs != null ? `+1 en ${formatCountdown(s.nextLifeSecs)}` : undefined;
}
