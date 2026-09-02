import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

type Tone = "neutral" | "wrong";

interface SignPlaceholderProps {
  label: string;
  height?: number;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string;
  style?: ViewStyle;
}

/**
 * El reconocimiento/animación de señas todavía es un placeholder en el
 * backend (docs/features/ml.md): no hay assets de avatar 3D reales todavía,
 * así que el bloque de seña se representa con esta tarjeta rayada + label,
 * igual que en el diseño.
 */
export function SignPlaceholder({ label, height = 320, tone = "neutral", icon = "play", badge, style }: SignPlaceholderProps) {
  const wrong = tone === "wrong";

  return (
    <View style={[styles.container, { height }, wrong && styles.containerWrong, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={[styles.iconCircle, wrong && styles.iconCircleWrong]}>
        <Ionicons name={icon} size={icon === "play" ? 24 : 23} color={colors.text} style={icon === "play" ? { marginLeft: 3 } : undefined} />
      </View>
      <View style={styles.labelChip}>
        <Text style={[styles.labelText, wrong && styles.labelTextWrong]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    overflow: "hidden",
  },
  containerWrong: {
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleWrong: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  labelChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  labelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  labelTextWrong: {
    color: "#B0503A",
  },
});
