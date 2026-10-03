import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts } from "@/theme";
import { achievementsApi } from "@/api/achievements";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { StreakMedal } from "@/features/achievements/components/StreakMedal";

type Props = NativeStackScreenProps<AppStackParamList, "StreakMilestone">;

const FIRE_ASPECT = 500 / 690;

export function StreakMilestoneScreen({ navigation, route }: Props) {
  const { achievementId, days, title, rewardStreakShields } = route.params;
  const insets = useSafeAreaInsets();

  // The reward is already credited server-side; marking it seen up front keeps a
  // killed app from replaying the same celebration forever.
  useEffect(() => {
    achievementsApi.markSeen(achievementId).catch(() => {});
  }, [achievementId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.fireWrap}>
        <LottieView
          source={require("@assets/animations/streak-fire.json")}
          autoPlay
          loop
          style={styles.fire}
          resizeMode="contain"
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>¡Llegaste a {days} días de racha!</Text>
        <Text style={styles.subtitle}>Seguís aprendiendo todos los días. ¡Así se hace!</Text>

        <View style={styles.rewardCard}>
          <StreakMedal days={days} size={72} animated />
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardKicker}>Logro desbloqueado</Text>
            <Text style={styles.rewardTitle} numberOfLines={2}>
              {title}
            </Text>
            {rewardStreakShields > 0 && (
              <View style={styles.rewardPill}>
                <Ionicons name="snow" size={14} color={colors.gemsBlueDark} />
                <Text style={styles.rewardPillText}>
                  +{rewardStreakShields} protector{rewardStreakShields > 1 ? "es" : ""} de racha
                </Text>
              </View>
            )}
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
    backgroundColor: colors.streakOrange,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  fireWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Sized by the free height (not width) so it shrinks on short phones instead of covering the text.
  fire: { height: "100%", maxHeight: 440, aspectRatio: FIRE_ASPECT },
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
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.gemsBlue + "1F",
  },
  rewardPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.gemsBlueDark,
  },
});
