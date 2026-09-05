import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeTabScreen } from "@/screens/tabs/HomeTabScreen";
import { PracticeTabScreen } from "@/screens/tabs/PracticeTabScreen";
import { StoreTabScreen } from "@/screens/tabs/StoreTabScreen";
import { SocialScreen } from "@/features/social/screens/SocialScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { colors } from "@/theme";

const BASE_TAB_BAR_PADDING_BOTTOM = 24;
const BASE_TAB_BAR_PADDING_TOP = 12;

export type TabParamList = {
  Home: undefined;
  Practice: undefined;
  Store: undefined;
  Social: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  // On devices with an on-screen nav bar (e.g. Moto E's 3-button bar) the app
  // draws edge-to-edge under it, so the tab bar needs insets.bottom added on
  // top of its own padding or the system buttons sit on top of the icons.
  const tabBarPaddingBottom = BASE_TAB_BAR_PADDING_BOTTOM + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }: any) => {
          const iconMap: Record<string, string> = {
            Home: focused ? "home" : "home-outline",
            Practice: focused ? "hand-left" : "hand-left-outline",
            Store: focused ? "storefront" : "storefront-outline",
            Social: focused ? "people" : "people-outline",
            Profile: focused ? "person" : "person-outline",
          };
          return <Ionicons name={iconMap[route.name] as any} size={26} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral600,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral200,
          borderTopWidth: 1,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: BASE_TAB_BAR_PADDING_TOP,
          height: 76 - BASE_TAB_BAR_PADDING_BOTTOM + tabBarPaddingBottom,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{ tabBarLabel: "Inicio" }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeTabScreen}
        options={{ tabBarLabel: "Práctica" }}
      />
      <Tab.Screen
        name="Store"
        component={StoreTabScreen}
        options={{ tabBarLabel: "Tienda" }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{ tabBarLabel: "Social" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
