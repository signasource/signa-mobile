import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

interface Props {
  onPress: () => void;
}

/**
 * Esquina inferior derecha del avatar. Vuelve a montar el visor desde cero:
 * es la salida cuando el modelo se ve con una textura que no es o no arranca.
 */
export function ReloadButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      activeOpacity={0.8}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Recargar animación"
    >
      <Ionicons name="refresh" size={16} color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 10,
    bottom: 10,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
