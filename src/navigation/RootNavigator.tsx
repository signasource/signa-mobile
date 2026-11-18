import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, NavigationContainerRef, NavigationState } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/context/AuthContext";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { usePushToken } from "@/hooks/usePushToken";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator, AppStackParamList } from "./AppNavigator";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { FriendAcceptedProvider, useFriendAccepted } from "@/context/FriendAcceptedContext";
import { FriendAcceptedModal } from "@/features/social/components/FriendAcceptedModal";
import { AchievementCelebrationProvider, useAchievementCelebration } from "@/features/achievements/AchievementCelebrationContext";
import { TourProvider } from "@/features/tour/TourContext";
import { TourOverlay } from "@/features/tour/components/TourOverlay";
import { colors } from "@/theme";
import { RoleBlockedScreen } from "@/screens/RoleBlockedScreen";

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return "";
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

function FriendAcceptedModalConnected({
  isInLesson,
  navigationRef,
}: {
  isInLesson: boolean;
  navigationRef: React.RefObject<NavigationContainerRef<AppStackParamList> | null>;
}) {
  const { pending, dismiss } = useFriendAccepted();

  const handleSendGift = () => {
    navigationRef.current?.navigate("Tabs", { screen: "Store" });
  };

  const handleViewProfile = (username: string) => {
    if (username) {
      navigationRef.current?.navigate("PublicProfile", { username });
    }
  };

  return (
    <FriendAcceptedModal
      pending={pending}
      isInLesson={isInLesson}
      onDismiss={dismiss}
      onSendGift={handleSendGift}
      onViewProfile={handleViewProfile}
    />
  );
}

/** Mid-lesson, or already on a celebration: nothing is shown on top. */
function isCelebrationBlocked(routeName: string): boolean {
  return (
    routeName === "" ||
    routeName === "Lesson" ||
    routeName === "StreakShield" ||
    routeName === "StreakDay" ||
    routeName === "AchievementCelebration"
  );
}

/**
 * Shows shield, streak-day and achievement celebrations on top of whatever the user is doing,
 * except mid-lesson. Order: shield (what happened overnight) → streak day → achievements.
 */
function AchievementCelebrationConnected({
  currentRouteName,
  navigationRef,
}: {
  currentRouteName: string;
  navigationRef: React.RefObject<NavigationContainerRef<AppStackParamList> | null>;
}) {
  const { pending, consume, pendingStreakDay, consumeStreakDay, pendingStreakShield, consumeStreakShield, refresh } = useAchievementCelebration();
  const previousRoute = useRef("");

  useEffect(() => {
    const left = previousRoute.current;
    previousRoute.current = currentRouteName;
    if (left === "Lesson" || left === "PracticeSession") refresh();
  }, [currentRouteName, refresh]);

  // One celebration at a time, in order: shield (what happened overnight) → streak day → achievement.
  // `inFlight` holds the route we just navigated to: until the navigator reports it, `currentRouteName`
  // is stale, and a second `navigate` would stack another celebration on top of the first one.
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (inFlight.current !== null) {
      if (currentRouteName === inFlight.current) inFlight.current = null;
      return;
    }
    if (isCelebrationBlocked(currentRouteName) || !navigationRef.current?.isReady()) return;

    if (pendingStreakShield !== null) {
      inFlight.current = "StreakShield";
      navigationRef.current.navigate("StreakShield", { streak: pendingStreakShield });
      consumeStreakShield();
    } else if (pendingStreakDay !== null) {
      inFlight.current = "StreakDay";
      navigationRef.current.navigate("StreakDay", { streak: pendingStreakDay });
      consumeStreakDay();
    } else if (pending) {
      inFlight.current = "AchievementCelebration";
      navigationRef.current.navigate("AchievementCelebration", {
        achievementId: pending.id,
        criteriaType: pending.criteriaType,
        criteriaValue: pending.criteriaValue,
        title: pending.title,
        rewardStreakShields: pending.rewardStreakShields,
        rewardGems: pending.rewardGems,
      });
      consume();
    }
  }, [
    pending,
    pendingStreakDay,
    pendingStreakShield,
    currentRouteName,
    consume,
    consumeStreakDay,
    consumeStreakShield,
    navigationRef,
  ]);

  return null;
}


export function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
    sessionExpired,
    resumeExpiredSession,
    dismissExpiredSession,
    authInitialRoute,
    user,
  } = useAuth();

  const navigationRef = useRef<NavigationContainerRef<AppStackParamList>>(null);
  const [currentRouteName, setCurrentRouteName] = useState("");

  // App-usage session telemetry (foreground stretches while signed in) → "sesiones por usuario".
  useSessionTracker(isAuthenticated);

  // Push notification token registration/cleanup.
  usePushToken(isAuthenticated);

  // Navigate to Notifications screen when the user taps a push notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate("Notifications");
      }
    });
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && user?.role && user.role !== "USER") {
    return <RoleBlockedScreen role={user.role} />;
  }

  return (
    <FriendAcceptedProvider isAuthenticated={isAuthenticated}>
      <AchievementCelebrationProvider isAuthenticated={isAuthenticated}>
      <TourProvider isAuthenticated={isAuthenticated} userId={user?.email ?? null}>
        {/* The tour overlay is a sibling of the navigator inside this box (not a Modal), so it
            shares the app's coordinate space and always sits on top of what it explains. */}
        <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={(state) => setCurrentRouteName(getActiveRouteName(state))}
        >
          {isAuthenticated ? (
            <AppNavigator />
          ) : (
            // La bienvenida es siempre la primera pantalla para usuarios no autenticados,
            // salvo que vengan de cerrar el aviso de sesión expirada, que va directo a Login.
            <AuthNavigator initialRoute={authInitialRoute} />
          )}
          {/* Se muestra encima de la pantalla actual (sin desmontarla) cuando la sesión se cierra sola. */}
          <SessionExpiredModal
            visible={sessionExpired}
            onLogin={resumeExpiredSession}
            onExit={dismissExpiredSession}
          />
        </NavigationContainer>
        <FriendAcceptedModalConnected
          isInLesson={currentRouteName === "Lesson"}
          navigationRef={navigationRef}
        />
        <AchievementCelebrationConnected currentRouteName={currentRouteName} navigationRef={navigationRef} />
        <TourOverlay navigationRef={navigationRef} />
        </View>
      </TourProvider>
      </AchievementCelebrationProvider>
    </FriendAcceptedProvider>
  );
}
