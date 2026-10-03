import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts } from "@/theme";
import { achievementsApi } from "@/api/achievements";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { StreakMedal } from "@/features/achievements/components/StreakMedal";
import { CelebrationAnimation } from "@/features/achievements/components/CelebrationAnimation";
import {
  CELEBRATION_THEMES,
  formatCount,
  headlineFor,
  kindFor,
  subtitleFor,
} from "@/features/achievements/celebrations";

type Props = NativeStackScreenProps<AppStackParamList, "AchievementCelebration">;

export function AchievementCelebrationScreen({ navigation, route }: Props) {
  const { achievementId, criteriaType, criteriaValue, title, rewardStreakShields, rewardGems } = route.params;
  const insets = useSafeAreaInsets();
  const kind = kindFor(criteriaType);
  const theme = CELEBRATION_THEMES[kind];

  // The reward is already credited server-side; marking it seen up front keeps a
  // killed app from replaying the same celebration forever.
  useEffect(() => {
    achievementsApi.markSeen(achievementId).catch(() => {});
  }, [achievementId]);

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
        <Text style={styles.title}>{headlineFor(kind, criteriaValue)}</Text>
        <Text style={styles.subtitle}>{subtitleFor(kind)}</Text>

        <View style={styles.rewardCard}>
          {kind === "streak" ? (
            <StreakMedal days={criteriaValue} size={72} animated />
          ) : (
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <Ionicons name={theme.icon} size={34} color={colors.white} />
            </View>
          )}
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardKicker}>Logro desbloqueado</Text>
            <Text style={styles.rewardTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.pills}>
              {rewardGems > 0 && (
                <View style={[styles.pill, styles.gemsPill]}>
                  <Ionicons name="diamond" size={13} color={colors.gemsBlueDark} />
                  <Text style={[styles.pillText, { color: colors.gemsBlueDark }]}>+{formatCount(rewardGems)} gemas</Text>
                </View>
              )}
              {rewardStreakShields > 0 && (
                <View style={[styles.pill, styles.gemsPill]}>
                  <Ionicons name="snow" size={13} color={colors.gemsBlueDark} />
                  <Text style={[styles.pillText, { color: colors.gemsBlueDark }]}>
                    +{rewardStreakShields} protector{rewardStreakShields > 1 ? "es" : ""} de racha
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <Button label="¡Genial!" onPress={() => navigation.goBack()} />
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
    color: colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    textAlign: "center",
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginTop: 8,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardInfo: { flex: 1, gap: 4 },
  rewardKicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  rewardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  gemsPill: { backgroundColor: colors.gemsBlue + "1F" },
  pillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
});
