import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { CoursesTabScreen } from "@/screens/tabs/CoursesTabScreen";
import { PracticeTabScreen } from "@/screens/tabs/PracticeTabScreen";
import { MoreTabScreen } from "@/screens/tabs/MoreTabScreen";
import { colors } from "@/theme";

export type TabParamList = {
  ProfileTab: undefined;
  CoursesTab: undefined;
  PracticeTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          const iconMap: Record<string, string> = {
            ProfileTab: focused ? "person" : "person-outline",
            CoursesTab: focused ? "school" : "school-outline",
            PracticeTab: focused ? "hand-left" : "hand-left-outline",
            MoreTab: focused ? "menu" : "menu-outline",
          };
          return <Ionicons name={iconMap[route.name] as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral600,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral200,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginBottom: 2,
        },
      })}
    >
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: "Perfil" }}
      />
      <Tab.Screen
        name="CoursesTab"
        component={CoursesTabScreen}
        options={{ tabBarLabel: "Cursos" }}
      />
      <Tab.Screen
        name="PracticeTab"
        component={PracticeTabScreen}
        options={{ tabBarLabel: "Practicar" }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreTabScreen}
        options={{ tabBarLabel: "Más" }}
      />
    </Tab.Navigator>
  );
}
