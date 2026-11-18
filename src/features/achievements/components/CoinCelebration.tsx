import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { alpha, colors } from "@/theme";
import type { Achievement } from "@/api/achievements";
import { useHaptics } from "@/hooks/useHaptics";
import { AchievementCoin } from "@/features/achievements/components/AchievementCoin";

interface CoinCelebrationProps {
  achievement: Pick<Achievement, "criteriaType" | "criteriaValue">;
}

const STAGE = 340;
const COIN = 230;
const LAND_MS = 900;
const BURST_AT = 650;
const BURST_MS = 1100;

/**
 * Haptics of the landing: a double hit (two clear thumps with a beat between), where the second one
 * rings out and fades in steps as the confetti falls. `at` is ms after the landing; the whole thing
 * stays under 1 s.
 */
const LANDING_HAPTICS: { at: number; kind: "heavy" | "medium" | "light" | "tick" }[] = [
  { at: 0, kind: "heavy" }, // first hit
  { at: 150, kind: "heavy" }, // second hit...
  { at: 250, kind: "medium" }, // ...and its decay
  { at: 360, kind: "medium" },
  { at: 490, kind: "light" },
  { at: 640, kind: "light" },
  { at: 810, kind: "tick" },
];

/** When the landing haptics are over (ms from mount). The gem counter waits for this so its ticks don't blur into the tail. */
export const LANDING_HAPTICS_DONE_MS = BURST_AT + LANDING_HAPTICS[LANDING_HAPTICS.length - 1].at + 60;

const RAY_COUNT = 14;
const CONFETTI_COLORS = [colors.onColor, colors.warning, colors.primary, colors.gemsBlue, colors.streakOrange];

interface Particle {
  dx: number;
  peak: number;
  fall: number;
  size: number;
  round: boolean;
  spin: number;
  color: string;
}

// Deterministic (no Math.random) so the burst looks the same on every render.
const PARTICLES: Particle[] = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.21;
  const dist = 110 + (i % 5) * 28;
  return {
    dx: Math.cos(angle) * dist,
    peak: Math.sin(angle) * dist - 40,
    fall: Math.sin(angle) * dist + 70 + (i % 4) * 14,
    size: 8 + (i % 3) * 3,
    round: i % 2 === 0,
    spin: (i % 2 === 0 ? 1 : -1) * (240 + (i % 4) * 90),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

/** Wedge `i` of the sunburst, as a path from the centre of a 2R x 2R box. */
function rayPath(i: number, radius: number): string {
  const step = (Math.PI * 2) / RAY_COUNT;
  const a0 = i * step;
  const a1 = a0 + step / 2;
  const r = radius;
  return `M${r} ${r}L${r + Math.cos(a0) * r} ${r + Math.sin(a0) * r}L${r + Math.cos(a1) * r} ${r + Math.sin(a1) * r}Z`;
}

/**
 * Big celebration for an achievement coin: rotating sunburst behind, the coin spins in from above
 * and lands with a shock-wave and a confetti burst, then floats with its light sweep. Everything
 * runs on the native driver.
 */
export function CoinCelebration({ achievement }: CoinCelebrationProps) {
  const land = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const spinRays = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;
  const haptics = useHaptics();
  // A ref, so toggling the setting mid-animation doesn't restart the celebration.
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;

  useEffect(() => {
    const landing = Animated.timing(land, {
      toValue: 1,
      duration: LAND_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    // The burst (rings + confetti) and the landing haptics are armed in the same tick, when this
    // delay ends: they can drift from the coin if the JS thread is busy, but never from each other.
    const burstDelay = Animated.delay(BURST_AT);
    const burstAnim = Animated.timing(burst, {
      toValue: 1,
      duration: BURST_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    let pulses: ReturnType<typeof setTimeout>[] = [];
    const raysIn = Animated.timing(rays, { toValue: 1, duration: 700, useNativeDriver: true });
    const raysSpin = Animated.loop(
      Animated.timing(spinRays, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })
    );
    const bob = Animated.sequence([
      Animated.delay(LAND_MS),
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
    ]);
    landing.start();
    burstDelay.start(({ finished }) => {
      if (!finished) return;
      pulses = LANDING_HAPTICS.map(({ at, kind }) => setTimeout(() => hapticsRef.current[kind](), at));
      burstAnim.start();
    });
    raysIn.start();
    raysSpin.start();
    bob.start();
    return () => {
      pulses.forEach(clearTimeout);
      landing.stop();
      burstDelay.stop();
      burstAnim.stop();
      raysIn.stop();
      raysSpin.stop();
      bob.stop();
    };
  }, [land, burst, rays, spinRays, float]);

  const coinStyle = {
    transform: [
      { perspective: 900 },
      { translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) },
      { rotateY: land.interpolate({ inputRange: [0, 1], outputRange: ["720deg", "0deg"] }) },
      { scale: land.interpolate({ inputRange: [0, 0.55, 0.8, 1], outputRange: [0.2, 1.18, 0.96, 1] }) },
    ],
    opacity: land.interpolate({ inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: "clamp" as const }),
  };
  const floatStyle = { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }] };
  const raysStyle = {
    opacity: rays,
    transform: [{ rotate: spinRays.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
  };

  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.layer, raysStyle]}>
        <Svg width={STAGE} height={STAGE}>
          <Defs>
            <RadialGradient id="rays" cx="50%" cy="50%" r="50%">
              <Stop offset="0.15" stopColor={colors.onColor} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.onColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {Array.from({ length: RAY_COUNT }, (_, i) => (
            <Path key={i} d={rayPath(i, STAGE / 2)} fill="url(#rays)" />
          ))}
        </Svg>
      </Animated.View>

      {[0, 0.18].map((delay, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              opacity: burst.interpolate({
                inputRange: [delay, delay + 0.15, delay + 0.7],
                outputRange: [0, 0.7, 0],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  scale: burst.interpolate({
                    inputRange: [delay, 1],
                    outputRange: [0.7, 1.55 - i * 0.2],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {PARTICLES.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.round ? p.size : p.size * 1.8,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: burst.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                { translateY: burst.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, p.peak, p.fall] }) },
                { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
                { scale: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0.7] }) },
              ],
            },
          ]}
        />
      ))}

      <Animated.View style={floatStyle}>
        <Animated.View style={coinStyle}>
          <AchievementCoin achievement={achievement} size={COIN} animated entrance={false} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: "center", justifyContent: "center" },
  layer: { position: "absolute" },
  ring: {
    position: "absolute",
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    borderWidth: 6,
    borderColor: alpha(colors.onColor, 0.9),
  },
  particle: { position: "absolute" },
});
