import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { useHaptics } from "@/hooks/useHaptics";
import { formatCount } from "@/features/achievements/celebrations";

interface GemRewardProps {
  gems: number;
  /** Wait before the count-up starts (lets the coin land first). */
  delayMs?: number;
}

const COUNT_MS = 800;
const MAX_TICKS = 10;

/** The prize of the celebration, big: "+20 gemas" counting up from 0, with a bump when it lands. */
export function GemReward({ gems, delayMs = 0 }: GemRewardProps) {
  const [shown, setShown] = useState(0);
  const count = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(1)).current;
  const haptics = useHaptics();
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;

  useEffect(() => {
    setShown(0);
    count.setValue(0);
    // The number is React state, so this one value runs on the JS thread; the bump below is native.
    // A light tick each time the counter crosses a step (at most MAX_TICKS), then a success buzz.
    const step = Math.max(1, gems / MAX_TICKS);
    let lastBucket = 0;
    const id = count.addListener(({ value }) => {
      setShown(Math.round(value));
      const bucket = Math.floor(value / step);
      if (bucket > lastBucket) {
        lastBucket = bucket;
        hapticsRef.current.tick();
      }
    });
    const anim = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(count, { toValue: gems, duration: COUNT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(bump, { toValue: 1.18, duration: 130, useNativeDriver: true }),
        Animated.spring(bump, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]),
    ]);
    anim.start(({ finished }) => {
      if (finished) hapticsRef.current.success();
    });
    return () => {
      anim.stop();
      count.removeListener(id);
    };
  }, [gems, delayMs, count, bump]);

  return (
    <Animated.View
      style={[styles.chip, { transform: [{ scale: bump }] }]}
      accessible
      accessibilityLabel={`Ganaste ${gems} ${gems === 1 ? "gema" : "gemas"}`}
    >
      <Ionicons name="diamond" size={30} color={colors.gemsBlue} />
      <View style={styles.texts}>
        <Text style={styles.amount}>+{formatCount(shown)}</Text>
        <Text style={styles.label}>{gems === 1 ? "gema" : "gemas"}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  texts: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  amount: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.gemsBlueDark,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gemsBlueDark,
  },
});
