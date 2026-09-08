import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator } from "./AppNavigator";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { colors } from "@/theme";

export function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
    sessionExpired,
    resumeExpiredSession,
    dismissExpiredSession,
    authInitialRoute,
  } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
  );
}
