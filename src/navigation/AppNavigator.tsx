import React from "react";
import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChangePasswordScreen } from "@/screens/ChangePasswordScreen";
import { ConnectionTestScreen } from "@/screens/ConnectionTestScreen";
import { LessonScreen } from "@/features/courses/screens/LessonScreen";
import { SignRecognitionScreen } from "@/features/ml/screens/SignRecognitionScreen";
import { TabNavigator, TabParamList } from "./TabNavigator";
import { colors, fonts } from "@/theme";

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ChangePassword: undefined;
  Lesson: { lessonId: string; unitLabel?: string };
  SignRecognition: undefined;
  ConnectionTest: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
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
      <Stack.Screen name="Lesson" component={LessonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignRecognition" component={SignRecognitionScreen} options={{ title: "Practicar" }} />
      <Stack.Screen name="ConnectionTest" component={ConnectionTestScreen} options={{ title: "Test de conexion" }} />
    </Stack.Navigator>
  );
}
