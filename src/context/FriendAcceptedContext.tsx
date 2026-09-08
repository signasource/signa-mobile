import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { notificationsApi } from "@/api/notifications";

export interface PendingFriendAccepted {
  notificationId: number;
  friendId: string;
  friendName: string;
  friendUsername: string;
}

interface FriendAcceptedContextValue {
  pending: PendingFriendAccepted | null;
  dismiss: () => void;
}

const FriendAcceptedContext = createContext<FriendAcceptedContextValue>({
  pending: null,
  dismiss: () => {},
});

export function useFriendAccepted() {
  return useContext(FriendAcceptedContext);
}

const POLL_INTERVAL_MS = 30_000;
// In-memory set so we don't re-show the same notification if the user dismisses.
const shownIds = new Set<number>();

interface Props {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function FriendAcceptedProvider({ children, isAuthenticated }: Props) {
  const [pending, setPending] = useState<PendingFriendAccepted | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const check = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await notificationsApi.getInbox(0, 10);
      const notification = data.content.find(
        (n) => n.code === "FRIEND_REQUEST_ACCEPTED" && !shownIds.has(n.id)
      );
      if (!notification) return;

      shownIds.add(notification.id);
      const meta = notification.metadata ?? {};
      setPending({
        notificationId: notification.id,
        friendId: meta.friendId ?? "",
        friendName: meta.friendName ?? meta.friend ?? notification.title,
        friendUsername: meta.friendUsername ?? "",
      });
    } catch {
      // Background polling — silent failure is acceptable.
    }
  }, [isAuthenticated]);

  const dismiss = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPending(null);
      return;
    }

    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        check();
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [isAuthenticated, check]);

  return (
    <FriendAcceptedContext.Provider value={{ pending, dismiss }}>
      {children}
    </FriendAcceptedContext.Provider>
  );
}
