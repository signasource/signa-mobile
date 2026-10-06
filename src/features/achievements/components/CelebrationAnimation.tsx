import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LoopingLottie } from "@/features/achievements/components/LoopingLottie";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import type { CelebrationTheme } from "@/features/achievements/celebrations";

const RING_SIZES = [150, 210, 270];

/**
 * Middle of the celebration screen. Plays the theme's Lottie; while a group still has no animation
 * (`animation: null`) it shows a mock: the group icon pulsing inside expanding rings.
 */
export function CelebrationAnimation({ theme }: { theme: CelebrationTheme }) {
  if (theme.animation) {
    return (
      <LoopingLottie source={theme.animation} style={[styles.lottie, { aspectRatio: theme.aspect }]} />
    );
  }
  return <MockAnimation icon={theme.icon} />;
}

function MockAnimation({ icon }: { icon: CelebrationTheme["icon"] }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const iconScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] });

  return (
    <View style={styles.mock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {RING_SIZES.map((size, i) => {
        // Rings are staggered by sampling the same value at a phase offset.
        const phase = i / RING_SIZES.length;
        const scale = pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.75 + phase * 0.2, 1.05 + phase * 0.2],
        });
        const opacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.35, 0.2, 0] });
        return <Animated.View key={size} style={[styles.ring, { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ scale }] }]} />;
      })}
      <Animated.View style={[styles.core, { transform: [{ scale: iconScale }] }]}>
        <Ionicons name={icon} size={72} color={colors.white} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lottie: { height: "100%", maxHeight: 360 },
  mock: { width: 280, height: 280, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", backgroundColor: colors.white },
  core: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white + "47",
  },
});
