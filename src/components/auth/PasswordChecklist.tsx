import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme";
import { PasswordRules } from "@/utils/validation";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.dot, ok ? styles.ok : styles.fail]}>{ok ? "✓" : "✗"}</Text>
      <Text style={[styles.label, ok ? styles.ok : styles.fail]}>{label}</Text>
    </View>
  );
}

/** Lista de requisitos de contraseña en vivo. */
export function PasswordChecklist({ rules }: { rules: PasswordRules }) {
  return (
    <View style={styles.list}>
      <Rule ok={rules.length} label="Entre 8 y 72 caracteres" />
      <Rule ok={rules.uppercase} label="Al menos una mayúscula" />
      <Rule ok={rules.lowercase} label="Al menos una minúscula" />
      <Rule ok={rules.digit} label="Al menos un número" />
      <Rule ok={rules.special} label="Al menos un símbolo (ej: @, #, !)" />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, marginLeft: 6, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  dot: { fontSize: 12, width: 14 },
  label: { fontSize: 12, fontFamily: fonts.bodyMedium },
  ok: { color: colors.success },
  fail: { color: colors.danger },
});
