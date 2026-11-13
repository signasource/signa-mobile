import React, { useEffect } from "react";
import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChangePasswordScreen } from "@/screens/ChangePasswordScreen";
import { VerifyEmailScreen } from "@/screens/VerifyEmailScreen";
import { ConfigurationScreen } from "@/screens/ConfigurationScreen";
import { EditProfileScreen } from "@/screens/EditProfileScreen";
import { ConnectionTestScreen } from "@/screens/ConnectionTestScreen";
import { LessonScreen } from "@/features/courses/screens/LessonScreen";
import { CourseDetailScreen } from "@/features/courses/screens/CourseDetailScreen";
import { SignDetailScreen } from "@/features/courses/screens/SignDetailScreen";
import { PracticeSessionScreen } from "@/features/practice/screens/PracticeSessionScreen";
import { NotificationsScreen } from "@/features/social/screens/NotificationsScreen";
import { PublicProfileScreen } from "@/features/social/screens/PublicProfileScreen";
import { FriendAcceptedScreen } from "@/features/social/screens/FriendAcceptedScreen";
import { AchievementCelebrationScreen } from "@/features/achievements/screens/AchievementCelebrationScreen";
import { StreakDayScreen } from "@/features/achievements/screens/StreakDayScreen";
import { GemShopScreen } from "@/features/store/screens/GemShopScreen";
import { PurchaseHistoryScreen } from "@/features/store/screens/PurchaseHistoryScreen";
import { TabNavigator, TabParamList } from "./TabNavigator";
import { colors, fonts } from "@/theme";
import { useSettings } from "@/context/SettingsContext";
import { BlockType } from "@/features/courses/lessonContent.types";

export type PracticeSessionParams =
  | { mode: "type"; blockType: BlockType; title: string }
  | { mode: "sign"; meaning: string }
  | { mode: "mistakes" };

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ChangePassword: undefined;
  VerifyEmail: undefined;
  SignDetail: { signMeaning: string };
  Configuration:
    | {
        updatedProfile?: { displayName: string; lastName: string; username: string };
        passwordChanged?: boolean;
      }
    | undefined;
  EditProfile: { displayName: string; lastName: string; username: string };
  Lesson: {
    lessonId: string;
    unitLabel?: string;
    signsCount?: number;
    /** Paid course to suggest on the completion screen (set when this lesson closes a unit). */
    suggestedCourse?: { id: string; name: string };
  };
  CourseDetail: { courseId: string };
  Notifications: undefined;
  PracticeSession: { mode: PracticeSessionParams };
  PublicProfile: { username: string };
  FriendAccepted: {
    friendId: string;
    friendName: string;
    friendUsername: string;
    friendStreak: number;
    friendAvatarUrl?: string | null;
  };
  AchievementCelebration: {
    achievementId: string;
    criteriaType: string;
    criteriaValue: number;
    title: string;
    rewardStreakShields: number;
    rewardGems: number;
  };
  /** A lesson added a day to the streak; `streak` is the count after today. */
  StreakDay: { streak: number };
  /** Gem packs shop. `missingGems` marks the smallest pack that covers them; `returnTo` (name of where the user came from) relabels the success button "Volver a ...". */
  GemShop: { missingGems?: number; returnTo?: string } | undefined;
  PurchaseHistory: undefined;
  ConnectionTest: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const { loadFontSize } = useSettings();

  useEffect(() => {
    loadFontSize();
  }, [loadFontSize]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.text },
        headerTintColor: colors.onColor,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Configuration" component={ConfigurationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Lesson" component={LessonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PracticeSession" component={PracticeSessionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FriendAccepted" component={FriendAcceptedScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AchievementCelebration"
        component={AchievementCelebrationScreen}
        options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade", gestureEnabled: false }}
      />
      <Stack.Screen
        name="StreakDay"
        component={StreakDayScreen}
        options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade", gestureEnabled: false }}
      />
      <Stack.Screen
        name="GemShop"
        component={GemShopScreen}
        options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="PurchaseHistory" component={PurchaseHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ConnectionTest" component={ConnectionTestScreen} options={{ title: "Test de conexion" }} />
      <Stack.Screen name="SignDetail" component={SignDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
