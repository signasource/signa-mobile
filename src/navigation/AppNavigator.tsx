import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChangePasswordScreen } from "@/screens/ChangePasswordScreen";
import { ConnectionTestScreen } from "@/screens/ConnectionTestScreen";
import { AnimationTestScreen } from "@/screens/AnimationTestScreen";
import { LessonScreen } from "@/features/courses/screens/LessonScreen";
import { SignRecognitionScreen } from "@/features/ml/screens/SignRecognitionScreen";
import { TabNavigator } from "./TabNavigator";
import { colors, fonts } from "@/theme";

export type AppStackParamList = {
  Tabs: undefined;
  ChangePassword: undefined;
  Lesson: { courseId: string; lessonId: string } | undefined;
  SignRecognition: undefined;
  ConnectionTest: undefined;
  AnimationTest: undefined;
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
      <Stack.Screen name="Lesson" component={LessonScreen} options={{ title: "Leccion" }} />
      <Stack.Screen name="SignRecognition" component={SignRecognitionScreen} options={{ title: "Practicar" }} />
      <Stack.Screen name="ConnectionTest" component={ConnectionTestScreen} options={{ title: "Test de conexion" }} />
      <Stack.Screen name="AnimationTest" component={AnimationTestScreen} options={{ title: "Test de animación 3D" }} />
    </Stack.Navigator>
  );
}
