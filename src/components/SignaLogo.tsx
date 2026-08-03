import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface SignaLogoProps {
  size?: number;
  barColor?: string;
  bgColor?: string;
}

export function SignaLogo({ size = 38, barColor = colors.primary, bgColor = colors.onPrimary }: SignaLogoProps) {
  const radius = size * 0.32;
  const barW = size * 0.1;
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: bgColor }]}>
      <View style={[styles.bar, { width: barW, height: size * 0.29, backgroundColor: barColor }]} />
      <View style={[styles.bar, { width: barW, height: size * 0.5, backgroundColor: barColor }]} />
      <View style={[styles.bar, { width: barW, height: size * 0.37, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bar: {
    borderRadius: 3,
  },
});
