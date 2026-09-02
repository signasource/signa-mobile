import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { LessonButton } from "./LessonButton";

interface LessonCompleteProps {
  lessonName: string;
  unitLabel: string;
  xpEarned: number;
  correctBlocks: number;
  totalBlocks: number;
  signsLearned: number;
  onClose: () => void;
  onRestart: () => void;
}

export function LessonComplete({
  lessonName,
  unitLabel,
  xpEarned,
  correctBlocks,
  totalBlocks,
  signsLearned,
  onClose,
  onRestart,
}: LessonCompleteProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.trophy}>
          <Ionicons name="trophy" size={52} color={colors.primary} />
        </View>
        <Text style={styles.title}>¡Lección completada!</Text>
        <Text style={styles.subtitle}>
          {lessonName} · {unitLabel}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={22} color={colors.primary} />
            <Text style={styles.statValue}>+{xpEarned}</Text>
            <Text style={styles.statLabel}>XP ganado</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={22} color={colors.success} />
            <Text style={styles.statValue}>
              {correctBlocks}/{totalBlocks}
            </Text>
            <Text style={styles.statLabel}>Aciertos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="hand-left" size={22} color={colors.courseTeal} />
            <Text style={styles.statValue}>{signsLearned}</Text>
            <Text style={styles.statLabel}>Señas nuevas</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <LessonButton label="Volver al camino" onPress={onClose} />
        <LessonButton label="Repasar la lección" variant="muted" onPress={onRestart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { paddingHorizontal: 20, alignItems: "flex-end" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingHorizontal: 24, alignItems: "center", gap: 14 },
  trophy: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: -1.1,
    color: colors.text,
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: "center",
  },
  footer: { padding: 20, gap: 10 },
});
