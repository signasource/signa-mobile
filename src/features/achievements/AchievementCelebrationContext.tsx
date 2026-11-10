import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { achievementsApi, Achievement } from "@/api/achievements";
import { usersApi } from "@/api/users";

interface AchievementCelebrationContextValue {
  /** Next achievement whose celebration hasn't been shown. */
  pending: Achievement | null;
  /** Drops `pending` from the queue; the screen marks it as seen on the backend. */
  consume: () => void;
  /** Streak length of a day added to the streak whose celebration hasn't been shown; goes before achievements. */
  pendingStreakDay: number | null;
  /** Drops `pendingStreakDay`; the screen marks it as seen on the backend. */
  consumeStreakDay: () => void;
  /** Asks the backend for new achievements and streak days (e.g. right after a lesson). */
  refresh: () => void;
}

const AchievementCelebrationContext = createContext<AchievementCelebrationContextValue>({
  pending: null,
  consume: () => {},
  pendingStreakDay: null,
  consumeStreakDay: () => {},
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
  const [streakDay, setStreakDay] = useState<number | null>(null);
  // Same idea for the streak day; cleared once the backend stops reporting it as pending.
  const handedOutStreak = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    // Cosmetic celebrations: a failed check is retried on the next lesson or app resume.
    const [unseen, day] = await Promise.all([
      achievementsApi.getUnseen().then((res) => res.data).catch(() => null),
      usersApi.getStreakDay().then((res) => res.data).catch(() => null),
    ]);
    if (unseen) setQueue(unseen.filter((a) => !handedOutIds.current.has(a.id)));
    if (day) {
      if (!day.pending) handedOutStreak.current = null;
      else if (day.currentStreak !== handedOutStreak.current) setStreakDay(day.currentStreak);
    }
  }, [isAuthenticated]);

  const consume = useCallback(() => {
    setQueue((current) => {
      if (current.length > 0) handedOutIds.current.add(current[0].id);
      return current.slice(1);
    });
  }, []);

  const consumeStreakDay = useCallback(() => {
    setStreakDay((current) => {
      if (current !== null) handedOutStreak.current = current;
      return null;
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      setStreakDay(null);
      handedOutIds.current.clear();
      handedOutStreak.current = null;
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
    <AchievementCelebrationContext.Provider
      value={{ pending: queue[0] ?? null, consume, pendingStreakDay: streakDay, consumeStreakDay, refresh }}
    >
      {children}
    </AchievementCelebrationContext.Provider>
  );
}
