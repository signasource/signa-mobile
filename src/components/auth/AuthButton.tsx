import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { colors, fonts } from "@/theme";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Botón principal oscuro ("pill") usado como CTA en todas las pantallas de auth. */
export function PrimaryButton({ label, onPress, loading, disabled, style }: AuthButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onDark} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Botón secundario relleno (ej: "Reenviar mail de verificación"). */
export function SecondaryButton({ label, onPress, loading, disabled, style }: AuthButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.secondary,
        pressed && styles.secondaryPressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={styles.secondaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    backgroundColor: colors.text,
    borderRadius: 18,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.6 },
  secondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    backgroundColor: colors.fill,
    borderRadius: 18,
  },
  secondaryPressed: { backgroundColor: colors.fillDark },
  secondaryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
});
