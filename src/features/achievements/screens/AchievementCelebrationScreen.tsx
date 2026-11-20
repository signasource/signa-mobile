import React, { useEffect, useRef } from "react";
import { Animated, Easing, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts } from "@/theme";
import { achievementsApi } from "@/api/achievements";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { StreakMedal } from "@/features/achievements/components/StreakMedal";
import { GemReward } from "@/features/achievements/components/GemReward";
import { CoinCelebration, LANDING_HAPTICS_DONE_MS } from "@/features/achievements/components/CoinCelebration";
import { coinFor } from "@/features/achievements/coins";
import { CelebrationAnimation } from "@/features/achievements/components/CelebrationAnimation";
import {
  CELEBRATION_THEMES,
  formatCount,
  headlineFor,
  kindFor,
  subtitleFor,
} from "@/features/achievements/celebrations";

/** The coin spins in for ~0.9 s; the text and reward card wait for it to land. */
const COIN_REVEAL_DELAY_MS = 1000;

type Props = NativeStackScreenProps<AppStackParamList, "AchievementCelebration">;

export function AchievementCelebrationScreen({ navigation, route }: Props) {
  const { achievementId, criteriaType, criteriaValue, title, rewardStreakShields, rewardGems } = route.params;
  const insets = useSafeAreaInsets();
  const kind = kindFor(criteriaType);
  const theme = CELEBRATION_THEMES[kind];
  // Achievements with a coin celebrate with the big coin; streaks keep the fire and the medal.
  const hasCoin = kind !== "streak" && coinFor({ criteriaType, criteriaValue }) !== null;
  const reveal = useRef(new Animated.Value(hasCoin ? 0 : 1)).current;

  // Text and reward card appear once the coin has landed.
  useEffect(() => {
    if (!hasCoin) return;
    const anim = Animated.sequence([
      Animated.delay(COIN_REVEAL_DELAY_MS),
      Animated.timing(reveal, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [hasCoin, reveal]);

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
        {hasCoin ? (
          <CoinCelebration achievement={{ criteriaType, criteriaValue }} />
        ) : (
          <CelebrationAnimation theme={theme} />
        )}
      </View>

      <Animated.View
        style={[
          styles.body,
          { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
        ]}
      >
        <Text style={styles.title}>{headlineFor(kind, criteriaValue)}</Text>
        <Text style={styles.subtitle}>{subtitleFor(kind)}</Text>

        {rewardGems > 0 && <GemReward gems={rewardGems} delayMs={hasCoin ? LANDING_HAPTICS_DONE_MS : 350} />}

        <View style={styles.rewardCard}>
          {kind === "streak" ? (
            <StreakMedal days={criteriaValue} size={72} animated />
          ) : hasCoin ? null : (
            <View style={[styles.iconBadge, { backgroundColor: theme.background }]}>
              <Ionicons name={theme.icon} size={34} color={colors.onColor} />
            </View>
          )}
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardKicker}>Logro desbloqueado</Text>
            <Text style={styles.rewardTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.pills}>
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
      </Animated.View>

      <Button
        label={rewardGems > 0 ? `Reclamar ${formatCount(rewardGems)} ${rewardGems === 1 ? "gema" : "gemas"}` : "¡Genial!"}
        onPress={() => navigation.goBack()}
      />
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
