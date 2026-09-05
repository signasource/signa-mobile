import React from "react";
import { Pressable, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

interface BackButtonProps {
  onPress: () => void;
  visible?: boolean;
  /** Arrow color — pass the header foreground when it sits on a colored header. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Navigation "back". No background, and the same chevron drawn in onboarding.
 */
export function BackButton({ onPress, visible = true, color = colors.text, style }: BackButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      <View style={[styles.arrow, { borderColor: color }]} />
    </Pressable>
  );
}

interface NavIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Backgroundless icon button for header navigation (bell, settings, …). */
export function NavIconButton({
  icon,
  onPress,
  color = colors.text,
  size = 22,
  label,
  children,
  style,
}: NavIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  pressed: { opacity: 0.55 },
  arrow: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },
});
