import React from "react";
import { StyleSheet, Text as RNText, TextProps } from "react-native";
import { useFontScale } from "@/context/SettingsContext";

export function Text({ style, ...props }: TextProps) {
  const scale = useFontScale();
  if (scale === 1) return <RNText style={style} {...props} />;
  const flat = StyleSheet.flatten(style);
  const scaledSize = flat?.fontSize != null ? Math.round(flat.fontSize * scale) : undefined;
  return <RNText style={scaledSize != null ? [style, { fontSize: scaledSize }] : style} {...props} />;
}
