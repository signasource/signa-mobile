import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { achievementsApi, Achievement } from "@/api/achievements";

interface AchievementCelebrationContextValue {
  /** Next achievement whose celebration hasn't been shown. */
  pending: Achievement | null;
  /** Drops `pending` from the queue; the screen marks it as seen on the backend. */
  consume: () => void;
  /** Asks the backend for new achievements (e.g. right after a lesson). */
  refresh: () => void;
}

const AchievementCelebrationContext = createContext<AchievementCelebrationContextValue>({
  pending: null,
  consume: () => {},
  refresh: () => {},
});

export function useAchievementCelebration() {
  return useContext(AchievementCelebrationContext);
}

interface Props {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function AchievementCelebrationProvider({ children, isAuthenticated }: Props) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Handed to the screen already; the backend may still list it until `markSeen` lands.
  const handedOutIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await achievementsApi.getUnseen();
      setQueue(data.filter((a) => !handedOutIds.current.has(a.id)));
    } catch {
      // Cosmetic celebration: a failed check is retried on the next lesson or app resume.
    }
  }, [isAuthenticated]);

  const consume = useCallback(() => {
    setQueue((current) => {
      if (current.length > 0) handedOutIds.current.add(current[0].id);
      return current.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      handedOutIds.current.clear();
      return;
    }

    refresh();

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        refresh();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, refresh]);

  return (
    <AchievementCelebrationContext.Provider value={{ pending: queue[0] ?? null, consume, refresh }}>
      {children}
    </AchievementCelebrationContext.Provider>
  );
}
