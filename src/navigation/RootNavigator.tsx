import React, { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, NavigationContainerRef, NavigationState } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator } from "./AppNavigator";
import { AppStackParamList } from "./AppNavigator";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { FriendAcceptedProvider, useFriendAccepted } from "@/context/FriendAcceptedContext";
import { FriendAcceptedModal } from "@/features/social/components/FriendAcceptedModal";
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

export function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
    sessionExpired,
    resumeExpiredSession,
    dismissExpiredSession,
    authInitialRoute,
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
    </FriendAcceptedProvider>
  );
}
