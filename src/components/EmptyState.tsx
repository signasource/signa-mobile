import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  style?: StyleProp<ViewStyle>;
}

/** The single empty-state style used across the app ("Todavía no hay actividad"). */
export function EmptyState({ icon, title, description, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

/** One-line variant, for sub-sections. */
export function EmptyNote({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 5,
  },
  note: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },
  noteText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: "center",
  },
});
