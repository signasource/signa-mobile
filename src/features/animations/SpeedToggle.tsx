import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";

export type VideoRate = 1 | 0.5;

interface Props {
  rate: VideoRate;
  onChange: (rate: VideoRate) => void;
  style?: ViewStyle;
}

/** Botón flotante para alternar un video de seña entre velocidad normal (1×) y cámara lenta (0.5×). */
export function SpeedToggle({ rate, onChange, style }: Props) {
  const slow = rate !== 1;
  return (
    <Pressable
      onPress={() => onChange(slow ? 1 : 0.5)}
      style={[styles.btn, slow && styles.btnActive, style]}
      accessibilityRole="button"
      accessibilityLabel={slow ? "Ver a velocidad normal" : "Ver en cámara lenta"}
      hitSlop={8}
    >
      <Text style={[styles.text, slow && styles.textActive]}>{slow ? "0.5×" : "1×"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    zIndex: 1,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: alpha(colors.onColor, 0.94),
  },
  btnActive: { backgroundColor: colors.text },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.textMuted },
  textActive: { color: colors.surface },
});
