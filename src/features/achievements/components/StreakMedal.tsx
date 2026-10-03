import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import LottieView from "lottie-react-native";
import { MEDAL_SOURCES, tierForDays } from "@/features/achievements/streakTier";

interface StreakMedalProps {
  /** Streak length the achievement stands for; picks the medal colour. */
  days: number;
  size: number;
  /** Looping animation (celebration screen) vs. a still frame (lists). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StreakMedal({ days, size, animated = false, style }: StreakMedalProps) {
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <LottieView
        source={MEDAL_SOURCES[tierForDays(days)]}
        autoPlay={animated}
        loop={animated}
        progress={animated ? undefined : 0.35}
        style={styles.fill}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
});
