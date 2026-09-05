import React from "react";
import { StyleSheet, Text as RNText, TextProps } from "react-native";
import { useFontScale } from "@/context/SettingsContext";

/**
 * App-wide text. Applies the accessibility font scale from `SettingsContext`.
 * Long-form body/paragraph styles opt into `textAlign: "justify"` themselves
 * (e.g. InfoBlock's `paragraph` style) — it's not a base default here because
 * RN's Android justification can clip glyphs at the right edge on narrow
 * columns, which reads as missing letters.
 */
export function Text({ style, ...props }: TextProps) {
  const scale = useFontScale();
  const flat = StyleSheet.flatten(style);
  const scaledSize =
    scale !== 1 && flat?.fontSize != null ? Math.round(flat.fontSize * scale) : undefined;

  return (
    <RNText style={[style, scaledSize != null && { fontSize: scaledSize }]} {...props} />
  );
}
