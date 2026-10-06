import React from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts } from "@/theme";
import { CELEBRATION_THEMES } from "@/features/achievements/celebrations";
import { CelebrationAnimation } from "@/features/achievements/components/CelebrationAnimation";

interface StreakKeptCelebrationProps {
  /** Current streak length after today's first activity. */
  days: number;
  onContinue: () => void;
}

/**
 * Shown the moment the day's first lesson keeps the streak alive — the fire from the
 * streak achievement screen, the new streak count, and a single "continuar". This is the
 * *daily* streak-extended moment, not the milestone screen (`AchievementCelebrationScreen`),
 * which fires only on 3/7/14/… day thresholds.
 */
export function StreakKeptCelebration({ days, onContinue }: StreakKeptCelebrationProps) {
  const insets = useSafeAreaInsets();
  const theme = CELEBRATION_THEMES.streak;

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
        <Text style={styles.title}>¡Mantuviste viva tu racha!</Text>
        <Text style={styles.count}>
          {days} {days === 1 ? "día" : "días"}
        </Text>
        <Text style={styles.subtitle}>Volvé mañana para que el fuego no se apague. 🔥</Text>
      </View>

      <Button label="¡Dale!" onPress={onContinue} />
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
  body: { gap: 6, alignItems: "center", paddingBottom: 24 },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.1,
    color: colors.white,
    textAlign: "center",
  },
  count: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2,
    color: colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    textAlign: "center",
    marginTop: 4,
  },
});
