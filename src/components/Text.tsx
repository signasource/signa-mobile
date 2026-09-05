import React from "react";
import { StyleSheet, Text as RNText, TextProps } from "react-native";
import { useFontScale } from "@/context/SettingsContext";

/**
 * App-wide text. Two jobs: apply the accessibility font scale from
 * `SettingsContext`, and justify copy by default — `textAlign: "justify"` only
 * affects lines that wrap, so single-line labels are untouched, and any style
 * that sets its own `textAlign` (centred empty states, stat cards, …) still
 * wins because it comes later in the style array.
 */
export function Text({ style, ...props }: TextProps) {
  const scale = useFontScale();
  const flat = StyleSheet.flatten(style);
  const scaledSize =
    scale !== 1 && flat?.fontSize != null ? Math.round(flat.fontSize * scale) : undefined;

  return (
    <RNText
      style={[styles.base, style, scaledSize != null && { fontSize: scaledSize }]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: "justify",
  },
});
