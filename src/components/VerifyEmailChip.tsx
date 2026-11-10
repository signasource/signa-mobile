import React from "react";
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";

interface VerifyEmailChipProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Pill that warns the email is still unverified and opens the verification screen. */
export function VerifyEmailChip({ onPress, style }: VerifyEmailChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Email sin verificar. Tocá para verificar tu cuenta"
    >
      <Ionicons name="mail-unread-outline" size={15} color={colors.neutral900} />
      <Text style={styles.label} numberOfLines={1}>
        Email sin verificar
      </Text>
      <Text style={styles.action}>Verificar</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.neutral900} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.neutral900,
  },
  action: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.neutral900,
    textDecorationLine: "underline",
  },
});
