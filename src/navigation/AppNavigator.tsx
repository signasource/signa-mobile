import React, { useEffect } from "react";
import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChangePasswordScreen } from "@/screens/ChangePasswordScreen";
import { ConfigurationScreen } from "@/screens/ConfigurationScreen";
import { ConnectionTestScreen } from "@/screens/ConnectionTestScreen";
import { LessonScreen } from "@/features/courses/screens/LessonScreen";
import { SignRecognitionScreen } from "@/features/ml/screens/SignRecognitionScreen";
import { NotificationsScreen } from "@/features/social/screens/NotificationsScreen";
import { PublicProfileScreen } from "@/features/social/screens/PublicProfileScreen";
import { TabNavigator, TabParamList } from "./TabNavigator";
import { colors, fonts } from "@/theme";
import { useSettings } from "@/context/SettingsContext";

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ChangePassword: undefined;
  Configuration: undefined;
  Lesson: { lessonId: string; unitLabel?: string };
  Notifications: undefined;
  PublicProfile: { username: string };
  SignRecognition: undefined;
  ConnectionTest: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const { loadFontSize } = useSettings();

  useEffect(() => {
    loadFontSize();
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.azulOscuro },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.headingSemiBold },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Cambiar contrasena" }} />
      <Stack.Screen name="Configuration" component={ConfigurationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Lesson" component={LessonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignRecognition" component={SignRecognitionScreen} options={{ title: "Practicar" }} />
      <Stack.Screen name="ConnectionTest" component={ConnectionTestScreen} options={{ title: "Test de conexion" }} />
    </Stack.Navigator>
  );
}
