import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { sessionsApi } from "@/api/sessions";

/** Below this a "session" is just a blip (navigation glance); above it is implausible/bad data. */
const MIN_SESSION_SECONDS = 3;
const MAX_SESSION_SECONDS = 6 * 60 * 60;

/**
 * Tracks whole-app foreground sessions while the user is signed in and reports each one to the
 * backend (`POST /sessions`) on foreground→background and on logout/unmount. A session is one
 * contiguous stretch with the app in the foreground; backgrounded time is never counted. Backs the
 * "sesiones por usuario" (frequency) and "duración promedio de sesión" admin metrics. Failures are
 * swallowed — telemetry must never disrupt the app.
 */
export function useSessionTracker(isAuthenticated: boolean) {
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    function begin() {
      if (startRef.current === null) startRef.current = Date.now();
    }

    function end() {
      if (startRef.current === null) return;
      const startedAtMs = startRef.current;
      startRef.current = null;
      const durationSeconds = Math.round((Date.now() - startedAtMs) / 1000);
      if (durationSeconds < MIN_SESSION_SECONDS || durationSeconds > MAX_SESSION_SECONDS) return;
      sessionsApi.record(new Date(startedAtMs).toISOString(), durationSeconds).catch(() => {});
    }

    if (AppState.currentState === "active") begin();

    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") begin();
      else end();
    });

    return () => {
      subscription.remove();
      end();
    };
  }, [isAuthenticated]);
}
