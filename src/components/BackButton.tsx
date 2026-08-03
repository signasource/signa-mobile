import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface BackButtonProps {
  onPress: () => void;
  visible?: boolean;
}

export function BackButton({ onPress, visible = true }: BackButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <View style={styles.arrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { backgroundColor: colors.fillDark },
  arrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    borderColor: colors.text,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },
});
