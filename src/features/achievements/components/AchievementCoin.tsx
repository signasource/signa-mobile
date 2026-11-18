import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme";
import type { Achievement } from "@/api/achievements";
import { coinFor } from "@/features/achievements/coins";

interface AchievementCoinProps {
  achievement: Pick<Achievement, "criteriaType" | "criteriaValue">;
  size: number;
  /** Pop-in plus a light sweep that repeats (celebration, detail modal) vs. a still coin (lists). */
  animated?: boolean;
  /** Spring pop-in when `animated`. Off when a parent already runs a bigger entrance. */
  entrance?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The coin face is 269.64 of the 300-unit artboard, so the shine is inset to stay inside it.
const COIN_INSET = (1 - 269.64 / 300) / 2;
const SWEEP_MS = 1200;
const PAUSE_MS = 2800;
const BAND_ROTATION = "20deg";

export function AchievementCoin({ achievement, size, animated = false, entrance = true, style }: AchievementCoinProps) {
  const Coin = coinFor(achievement);
  const sweep = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(animated && entrance ? 0.6 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    const popIn = Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true });
    sweep.setValue(0);
    // Animated.loop resets the value before each pass; the band sits off-screen at both ends.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: SWEEP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(PAUSE_MS),
      ])
    );
    if (entrance) popIn.start();
    loop.start();
    return () => {
      popIn.stop();
      loop.stop();
    };
  }, [animated, entrance, pop, sweep]);

  if (!Coin) return null;

  const inset = size * COIN_INSET;
  const bandWidth = size * 0.26;
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-bandWidth * 1.5, size + bandWidth] });

  return (
    <Animated.View
      style={[{ width: size, height: size, transform: [{ scale: pop }] }, style]}
      pointerEvents="none"
    >
      <Coin width={size} height={size} />
      {animated && (
        <View
          style={[
            styles.clip,
            { top: inset, left: inset, right: inset, bottom: inset, borderRadius: size / 2 },
          ]}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: -size * 0.25,
              width: bandWidth,
              height: size * 1.5,
              transform: [{ translateX }, { rotate: BAND_ROTATION }],
            }}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.onColor} stopOpacity={0} />
                  <Stop offset="0.5" stopColor={colors.onColor} stopOpacity={0.7} />
                  <Stop offset="1" stopColor={colors.onColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#shine)" />
            </Svg>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { position: "absolute", overflow: "hidden" },
});
