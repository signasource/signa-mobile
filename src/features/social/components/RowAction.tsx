import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

export interface RowActionSpec {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Sirve de `accessibilityLabel`: los botones son sólo ícono. */
  label: string;
  bg: string;
  color: string;
  onPress: () => void;
}

interface Props {
  action: RowActionSpec;
  busy?: boolean;
}

/** Botón cuadrado de 36px que acompaña a cada fila de persona. */
export function RowAction({ action, busy = false }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: action.bg }]}
      onPress={action.onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={action.color} />
      ) : (
        <Ionicons name={action.icon} size={17} color={action.color} />
      )}
    </TouchableOpacity>
  );
}

export const ROW_ACTION_STYLE = {
  add: { bg: colors.socialWine, color: colors.onDark },
  accept: { bg: colors.successLight, color: colors.successDark },
  reject: { bg: colors.dangerLight, color: colors.danger },
  neutral: { bg: colors.fill, color: colors.text },
  muted: { bg: colors.fill, color: colors.textMuted },
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
