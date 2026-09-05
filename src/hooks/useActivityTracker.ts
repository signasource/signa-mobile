import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { usersApi } from "@/api/users";

const FLUSH_INTERVAL_MS = 60_000;
const MAX_MINUTES_PER_REQUEST = 5;

/**
 * Tracks foreground time spent on the screen that calls this hook and reports it
 * to the backend as "learning minutes" (`POST /users/me/activity`), which backs the
 * "Meta diaria" progress in ProfileScreen. Time spent with the app backgrounded is
 * never counted, so leaving the app open idle does not inflate the daily goal.
 */
export function useActivityTracker() {
  const activeSecondsRef = useRef(0);
  const lastTickAtRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      if (appStateRef.current === "active" && lastTickAtRef.current !== null) {
        activeSecondsRef.current += (now - lastTickAtRef.current) / 1000;
      }
      lastTickAtRef.current = now;
    }

    function flush() {
      tick();
      let minutes = Math.floor(activeSecondsRef.current / 60);
      if (minutes <= 0) return;
      activeSecondsRef.current -= minutes * 60;
      while (minutes > 0) {
        const chunk = Math.min(MAX_MINUTES_PER_REQUEST, minutes);
        usersApi.recordActivity(chunk).catch(() => {});
        minutes -= chunk;
      }
    }

    lastTickAtRef.current = Date.now();
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (next) => {
      tick();
      appStateRef.current = next;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      flush();
    };
  }, []);
}
