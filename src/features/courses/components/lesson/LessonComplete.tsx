import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { NavIconButton } from "@/components/BackButton";
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
  // Only what the user actually earned is worth a card; zeroes read as failure.
  const stats = [
    {
      key: "xp",
      icon: "flash" as const,
      color: colors.primary,
      value: `+${xpEarned}`,
      label: "XP ganado",
      earned: xpEarned > 0,
    },
    {
      key: "correct",
      icon: "checkmark-done" as const,
      color: colors.success,
      value: `${correctBlocks}/${totalBlocks}`,
      label: "Aciertos",
      earned: correctBlocks > 0,
    },
    {
      key: "signs",
      icon: "hand-left" as const,
      color: colors.courseTeal,
      value: String(signsLearned),
      label: "Señas nuevas",
      earned: signsLearned > 0,
    },
  ].filter((stat) => stat.earned);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <NavIconButton icon="close" label="Cerrar" size={22} onPress={onClose} />
      </View>

      <View style={styles.body}>
        <View style={styles.trophy}>
          <Ionicons name="trophy" size={52} color={colors.primary} />
        </View>
        <Text style={styles.title}>¡Lección completada!</Text>
        <Text style={styles.subtitle}>
          {lessonName} · {unitLabel}
        </Text>

        {stats.length > 0 && (
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.statCard}>
                <Ionicons name={stat.icon} size={22} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
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
