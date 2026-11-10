import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, StyleProp, ViewStyle, View } from "react-native";
import { Text } from "@/components/Text";
import GoogleLogo from "@assets/ilus/google.svg";
import { colors, fonts } from "@/theme";

interface GoogleButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Botón "Continuar con Google" (outlined, logo de marca) para login y registro. */
export function GoogleButton({ label, onPress, loading, disabled, style }: GoogleButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          <GoogleLogo width={20} height={20} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.6 },
});
