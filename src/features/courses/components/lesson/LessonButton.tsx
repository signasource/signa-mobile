import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

type Variant = "primary" | "muted" | "outline";

interface LessonButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export function LessonButton({ label, onPress, variant = "primary", icon, disabled }: LessonButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.base, variantStyles[variant], disabled && styles.disabled]}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={18} color={textColor[variant]} />}
        <Text style={[styles.label, { color: textColor[variant] }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  muted: { backgroundColor: colors.fill },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.neutral200 },
});

const textColor: Record<Variant, string> = {
  primary: colors.onPrimary,
  muted: colors.text,
  outline: colors.primaryDark,
};
