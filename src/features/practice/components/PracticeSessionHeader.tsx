import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { colors, fonts } from "@/theme";

interface PracticeSessionHeaderProps {
  title: string;
  progress: number;
  onBack: () => void;
}

/**
 * Lighter header for a practice session — no lives (practice never costs them,
 * see docs/features/practice.md), unlike LessonHeader.
 */
export function PracticeSessionHeader({ title, progress, onBack }: PracticeSessionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 11 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressTrack: {
    flex: 1,
    height: 9,
    borderRadius: 99,
    backgroundColor: colors.fill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: colors.courseTeal,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
});
