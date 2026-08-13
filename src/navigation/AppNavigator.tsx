import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ChangePasswordScreen } from "@/screens/ChangePasswordScreen";
import { ConnectionTestScreen } from "@/screens/ConnectionTestScreen";
import { CoursesListScreen } from "@/features/courses/screens/CoursesListScreen";
import { LessonScreen } from "@/features/courses/screens/LessonScreen";
import { SignRecognitionScreen } from "@/features/ml/screens/SignRecognitionScreen";
import { ShopScreen } from "@/features/shop/screens/ShopScreen";
import { colors, fonts } from "@/theme";

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Courses: undefined;
  Lesson: { courseId: string; lessonId: string } | undefined;
  SignRecognition: undefined;
  ConnectionTest: undefined;
  Tienda: undefined;
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Perfil" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Cambiar contrasena" }} />
      <Stack.Screen name="Courses" component={CoursesListScreen} options={{ title: "Cursos" }} />
      <Stack.Screen name="Lesson" component={LessonScreen} options={{ title: "Leccion" }} />
      <Stack.Screen name="SignRecognition" component={SignRecognitionScreen} options={{ title: "Practicar" }} />
      <Stack.Screen name="ConnectionTest" component={ConnectionTestScreen} options={{ title: "Test de conexion" }} />
      <Stack.Screen name="Tienda" component={ShopScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
