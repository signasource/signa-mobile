import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface OnboardingProgressProps {
  progress: number; // 0 to 1
  onBack?: () => void;
}

export function OnboardingProgress({ progress, onBack }: OnboardingProgressProps) {
  return (
    <View style={styles.row}>
      {onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <View style={styles.arrow} />
        </Pressable>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backBtnPressed: {
    opacity: 0.55,
  },
  arrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    borderColor: colors.text,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },
  track: {
    flex: 1,
    height: 9,
    backgroundColor: colors.fill,
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 99,
  },
});
