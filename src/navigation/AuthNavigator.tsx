import React from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { ONBOARDING_TOTAL_STEPS } from "@/features/onboarding/types";

// Onboarding screens
import { WelcomeScreen } from "@/features/onboarding/screens/WelcomeScreen";
import { IntroScreen } from "@/features/onboarding/screens/IntroScreen";
import { DailyGoalScreen } from "@/features/onboarding/screens/DailyGoalScreen";
import { ExperienceScreen } from "@/features/onboarding/screens/ExperienceScreen";
import { MotivationScreen } from "@/features/onboarding/screens/MotivationScreen";
import { AchievementScreen } from "@/features/onboarding/screens/AchievementScreen";

// Auth screens
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { ForgotPasswordSentScreen } from "@/screens/auth/ForgotPasswordSentScreen";
import { ResetPasswordScreen } from "@/screens/auth/ResetPasswordScreen";

export type AuthStackParamList = {
  // Onboarding
  Welcome: undefined;
  Intro: undefined;
  DailyGoal: undefined;
  Experience: undefined;
  Motivation: undefined;
  Achievement: undefined;
  // Auth
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email?: string } | undefined;
  ForgotPassword: undefined;
  ForgotPasswordSent: { email: string };
  ResetPassword: { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Paso de cada pantalla de onboarding con barra de progreso compartida.
// La barra se renderiza como overlay fijo para que permanezca inmóvil
// mientras solo cambia el contenido de las preguntas al navegar.
const ONBOARDING_STEP: Partial<Record<keyof AuthStackParamList, number>> = {
  Intro: 1,
  DailyGoal: 2,
  Experience: 3,
  Motivation: 4,
};

/** Barra de progreso fija que no participa de la animación de transición. */
function OnboardingProgressOverlay() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const routeName = useNavigationState(
    (state) => state?.routes[state.index]?.name as keyof AuthStackParamList | undefined
  );

  const step = routeName ? ONBOARDING_STEP[routeName] : undefined;
  if (step == null) return null;

  return (
    <View style={[styles.progressOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
      <OnboardingProgress
        progress={step / ONBOARDING_TOTAL_STEPS}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
    </View>
  );
}

interface AuthNavigatorProps {
  initialRoute?: keyof AuthStackParamList;
}

export function AuthNavigator({ initialRoute = "Welcome" }: AuthNavigatorProps) {
  return (
    <View style={styles.root}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="DailyGoal" component={DailyGoalScreen} />
        <Stack.Screen name="Experience" component={ExperienceScreen} />
        <Stack.Screen name="Motivation" component={MotivationScreen} />
        <Stack.Screen name="Achievement" component={AchievementScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ForgotPasswordSent" component={ForgotPasswordSentScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
      <OnboardingProgressOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressOverlay: {
    position: "absolute",
    left: 30,
    right: 30,
  },
});
