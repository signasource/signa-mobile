import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, NavigationContainerRef, NavigationState } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator, AppStackParamList } from "./AppNavigator";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { FriendAcceptedProvider, useFriendAccepted } from "@/context/FriendAcceptedContext";
import { FriendAcceptedModal } from "@/features/social/components/FriendAcceptedModal";
import { AchievementCelebrationProvider, useAchievementCelebration } from "@/features/achievements/AchievementCelebrationContext";
import { TourProvider } from "@/features/tour/TourContext";
import { TourOverlay } from "@/features/tour/components/TourOverlay";
import { organizationsApi } from "@/api/organizations";
import { colors } from "@/theme";

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

/**
 * Shows the achievement celebration on top of whatever the user is doing, except mid-lesson,
 * and re-checks for new achievements as soon as a lesson or practice session is left.
 */
function AchievementCelebrationConnected({
  currentRouteName,
  navigationRef,
}: {
  currentRouteName: string;
  navigationRef: React.RefObject<NavigationContainerRef<AppStackParamList> | null>;
}) {
  const { pending, consume, refresh } = useAchievementCelebration();
  const previousRoute = useRef("");

  useEffect(() => {
    const left = previousRoute.current;
    previousRoute.current = currentRouteName;
    if (left === "Lesson" || left === "PracticeSession") refresh();
  }, [currentRouteName, refresh]);

  useEffect(() => {
    if (!pending) return;
    if (currentRouteName === "" || currentRouteName === "Lesson" || currentRouteName === "AchievementCelebration") return;
    if (!navigationRef.current?.isReady()) return;

    navigationRef.current.navigate("AchievementCelebration", {
      achievementId: pending.id,
      criteriaType: pending.criteriaType,
      criteriaValue: pending.criteriaValue,
      title: pending.title,
      rewardStreakShields: pending.rewardStreakShields,
      rewardGems: pending.rewardGems,
    });
    consume();
  }, [pending, currentRouteName, consume, navigationRef]);

  return null;
}

function OrgWelcomeConnected({
  isAuthenticated,
  navigationRef,
}: {
  isAuthenticated: boolean;
  navigationRef: React.RefObject<NavigationContainerRef<AppStackParamList> | null>;
}) {
  const checked = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      checked.current = false;
      return;
    }
    if (checked.current) return;
    checked.current = true;

    async function checkOrgWelcome() {
      try {
        const response = await organizationsApi.getMyOrganization();
        const org = response.data;

        const key = `org_welcome_shown_${org.id}`;
        const shown = await AsyncStorage.getItem(key);
        if (shown) return;

        await AsyncStorage.setItem(key, "true");

        const waitAndNavigate = () => {
          if (!navigationRef.current?.isReady()) {
            setTimeout(waitAndNavigate, 100);
            return;
          }
          navigationRef.current.navigate("OrganizationWelcome", {
            orgName: org.name,
            courses: org.courses,
            alreadyMember: true,
          });
        };
        setTimeout(waitAndNavigate, 500);
      } catch {
        // User has no org or API error — do nothing
      }
    }

    checkOrgWelcome();
  }, [isAuthenticated, navigationRef]);

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FriendAcceptedProvider isAuthenticated={isAuthenticated}>
      <AchievementCelebrationProvider isAuthenticated={isAuthenticated}>
      <TourProvider isAuthenticated={isAuthenticated} userId={user?.email ?? null}>
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
        <OrgWelcomeConnected isAuthenticated={isAuthenticated} navigationRef={navigationRef} />
        <TourOverlay />
      </TourProvider>
      </AchievementCelebrationProvider>
    </FriendAcceptedProvider>
  );
}
