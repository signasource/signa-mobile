import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSizes } from "@/theme";

interface StatPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

export function StatPill({ icon, label, value }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Ionicons name={icon} size={17} color={colors.onPrimary} />
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255,255,255,.16)",
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onPrimary,
    opacity: 0.75,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  value: { fontFamily: fonts.displayBold, fontSize: 21, color: colors.onPrimary },
});
