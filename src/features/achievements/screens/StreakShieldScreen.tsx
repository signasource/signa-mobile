import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts } from "@/theme";
import { usersApi } from "@/api/users";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { CelebrationAnimation } from "@/features/achievements/components/CelebrationAnimation";
import { CELEBRATION_THEMES, streakShieldHeadline, streakShieldSubtitle } from "@/features/achievements/celebrations";

type Props = NativeStackScreenProps<AppStackParamList, "StreakShield">;

/** Shown when the nightly scheduler burned a shield to protect the user's streak. */
export function StreakShieldScreen({ navigation, route }: Props) {
  const { streak } = route.params;
  const insets = useSafeAreaInsets();
  const theme = CELEBRATION_THEMES.shield;

  // Mark seen up front so a killed app doesn't replay the same screen on the next open.
  useEffect(() => {
    usersApi.markStreakShieldSeen().catch(() => {});
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      <View style={styles.animationWrap}>
        <CelebrationAnimation theme={theme} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{streakShieldHeadline(streak)}</Text>
        <Text style={styles.subtitle}>{streakShieldSubtitle()}</Text>
      </View>

      <Button label="¡Seguir aprendiendo!" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  animationWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { gap: 12, alignItems: "center", paddingBottom: 20 },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
    color: colors.onColor,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    textAlign: "center",
  },
});
