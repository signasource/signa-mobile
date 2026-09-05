import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "@/components/BackButton";
import { colors, fonts } from "@/theme";

interface LessonHeaderProps {
  unitLabel: string;
  lessonName: string;
  progress: number;
  lives: number;
  unlimitedLives?: boolean;
  onBack: () => void;
}

export function LessonHeader({ unitLabel, lessonName, progress, lives, unlimitedLives, onBack }: LessonHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.livesRow}>
          <Ionicons name={unlimitedLives || lives > 0 ? "heart" : "heart-outline"} size={19} color={colors.livesRed} />
          {unlimitedLives ? (
            <Ionicons name="infinite" size={17} color={colors.text} />
          ) : (
            <Text style={[styles.livesText, lives === 0 && { color: colors.livesRed }]}>{lives}</Text>
          )}
        </View>
      </View>
      <View style={styles.breadcrumb}>
        <Text style={styles.unitLabel} numberOfLines={1}>
          {unitLabel}
        </Text>
        <View style={styles.dot} />
        <Text style={styles.lessonName} numberOfLines={1}>
          {lessonName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 11,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
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
    backgroundColor: colors.primary,
  },
  livesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  livesText: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.text,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  unitLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    flexShrink: 0,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#C9BFB7",
    flexShrink: 0,
  },
  lessonName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.text,
    flexShrink: 1,
  },
});
