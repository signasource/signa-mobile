import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
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
      <Rule ok={rules.length} label="Al menos 8 caracteres" />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 2, marginLeft: 6, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  dot: { fontSize: 12, width: 14 },
  label: { fontSize: 12, fontFamily: fonts.bodyMedium },
  ok: { color: colors.success },
  fail: { color: colors.danger },
});
