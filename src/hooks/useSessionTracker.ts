import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { sessionsApi } from "@/api/sessions";

/** Below this a "session" is just a blip (navigation glance); above it is implausible/bad data. */
const MIN_SESSION_SECONDS = 3;
const MAX_SESSION_SECONDS = 6 * 60 * 60;
/** While the app stays in the foreground the running session is re-reported this often. */
const HEARTBEAT_MS = 30_000;

/** RFC 4122 v4 id; only used to let the server upsert one session across heartbeats. */
function newSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Tracks whole-app foreground sessions while the user is signed in and reports them to the backend
 * (`POST /sessions`). The running session is re-sent every 30 s (heartbeat, upserted server-side by
 * `sessionId`) and once more on foreground→background and on logout/unmount, so a session shows up
 * even if the app is killed or stays open. A session is one contiguous stretch with the app in the
 * foreground; backgrounded time is never counted. Backs the "sesiones por usuario" (frequency) and
 * "duración promedio de sesión" admin metrics. Failures are swallowed — telemetry must never
 * disrupt the app.
 */
export function useSessionTracker(isAuthenticated: boolean) {
  const sessionRef = useRef<{ id: string; startedAtMs: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    function report() {
      const session = sessionRef.current;
      if (!session) return;
      const durationSeconds = Math.round(
        (Date.now() - session.startedAtMs) / 1000,
      );
      if (
        durationSeconds < MIN_SESSION_SECONDS ||
        durationSeconds > MAX_SESSION_SECONDS
      )
        return;
      sessionsApi
        .record(
          new Date(session.startedAtMs).toISOString(),
          durationSeconds,
          session.id,
        )
        .catch(() => {});
    }

    function begin() {
      if (sessionRef.current !== null) return;
      sessionRef.current = { id: newSessionId(), startedAtMs: Date.now() };
      timer = setInterval(report, HEARTBEAT_MS);
    }

    function end() {
      if (timer) clearInterval(timer);
      timer = null;
      if (sessionRef.current === null) return;
      report();
      sessionRef.current = null;
    }

    if (AppState.currentState === "active") begin();

    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") begin();
        else end();
      },
    );

    return () => {
      subscription.remove();
      end();
    };
  }, [isAuthenticated]);
}
