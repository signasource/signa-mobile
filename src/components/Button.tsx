import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";

type Variant = "primary" | "secondary";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Primary = black CTA. Secondary = the neutral "Cancelar" button. No shadows. */
export function Button({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const secondary = variant === "secondary";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        secondary ? styles.secondary : styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.neutral900 : colors.onDark} />
      ) : (
        <Text style={[styles.label, secondary && styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.text },
  secondary: { backgroundColor: colors.neutral100 },
  label: {
    color: colors.onDark,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
  },
  labelSecondary: {
    color: colors.neutral900,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
