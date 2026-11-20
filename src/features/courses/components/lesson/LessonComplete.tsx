import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { NavIconButton } from "@/components/BackButton";
import { LessonButton } from "./LessonButton";
import { useSecondsLeft, formatCountdown } from "@/hooks/useSecondsLeft";
import ManoLeccionFinalizada from "@assets/ilus/mano-leccion-finalizada.svg";

interface LessonCompleteProps {
  lessonName: string;
  unitLabel: string;
  /** Se omitió algún ejercicio: no se celebra y "Repasar" pasa a ser la acción principal. */
  incomplete?: boolean;
  xpEarned: number;
  correctBlocks: number;
  totalBlocks: number;
  signsLearned: number;
  onClose: () => void;
  onRestart: () => void;
  /** Paid course to suggest below the stats (only when a unit was just closed). */
  suggestion?: { name: string; onOpen: () => void };
  /** Active XP multiplier value (e.g. 2.0); omit or pass 1 when inactive. */
  xpMultiplierValue?: number;
  /** ISO expiry of the active XP multiplier; drives the countdown shown on the XP card. */
  xpMultiplierExpiresAt?: string | null;
}

export function LessonComplete({
  lessonName,
  unitLabel,
  incomplete = false,
  xpEarned,
  correctBlocks,
  totalBlocks,
  signsLearned,
  onClose,
  onRestart,
  suggestion,
  xpMultiplierValue,
  xpMultiplierExpiresAt,
}: LessonCompleteProps) {
  const xpSecs = useSecondsLeft(xpMultiplierExpiresAt);
  const multiplierActive = !incomplete && (xpMultiplierValue ?? 1) > 1 && xpSecs > 0;

  // Only what the user actually earned is worth a card; zeroes read as failure.
  const stats = [
    {
      key: "xp",
      icon: "flash" as const,
      color: multiplierActive ? colors.warning : colors.primary,
      // Una lección incompleta no acredita XP al total: el XP queda a la espera de completarla.
      value: incomplete ? `${xpEarned}` : `+${xpEarned}`,
      label: incomplete ? "XP al completar" : "XP ganado",
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
        <View style={styles.illustration}>
          <ManoLeccionFinalizada width={190} height={190} />
        </View>
        <Text style={styles.title}>{incomplete ? "Lección incompleta" : "¡Lección completada!"}</Text>
        <Text style={styles.subtitle}>
          {lessonName} · {unitLabel}
        </Text>

        {stats.length > 0 && (
          <View style={styles.statsRow}>
            {stats.map((stat) => {
              const isXp = stat.key === "xp";
              const boosted = isXp && multiplierActive;
              return (
                <View
                  key={stat.key}
                  style={[
                    styles.statCard,
                    stats.length > 1 ? styles.statCardFlex : styles.statCardSingle,
                    boosted && styles.statCardBoosted,
                  ]}
                >
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  {boosted && (
                    <View style={styles.boostBadge}>
                      <Text style={styles.boostBadgeText}>
                        x{xpMultiplierValue} · {formatCountdown(xpSecs)} restantes
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {suggestion && (
          <TouchableOpacity style={styles.suggestion} onPress={suggestion.onOpen} activeOpacity={0.85}>
            <View style={styles.suggestionIcon}>
              <Ionicons name="school" size={20} color={colors.onDark} />
            </View>
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionKicker}>SEGUÍ APRENDIENDO</Text>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {suggestion.name}
              </Text>
            </View>
            <View style={styles.suggestionCta}>
              <Text style={styles.suggestionCtaText}>Ver</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.text} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        {incomplete ? (
          <>
            <LessonButton label="Repasar la lección" onPress={onRestart} />
            <LessonButton label="Volver al camino" variant="muted" onPress={onClose} />
          </>
        ) : (
          <>
            <LessonButton label="Volver al camino" onPress={onClose} />
            <LessonButton label="Repasar la lección" variant="muted" onPress={onRestart} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { paddingHorizontal: 20, alignItems: "flex-end" },
  body: { flex: 1, paddingHorizontal: 24, alignItems: "center", gap: 14 },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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
  statsRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8, justifyContent: "center" },
  statCard: {
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
  statCardFlex: { flex: 1 },
  statCardSingle: { width: 160 },
  statCardBoosted: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  boostBadge: {
    backgroundColor: colors.warning,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  boostBadgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10.5,
    color: colors.text,
    textAlign: "center",
  },
  footer: { padding: 20, gap: 10 },
  suggestion: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 18,
    padding: 12,
    marginTop: 8,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.courseIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: { flex: 1, minWidth: 0 },
  suggestionKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.textMuted,
  },
  suggestionName: { fontFamily: fonts.displayExtraBold, fontSize: 16, color: colors.text, marginTop: 2 },
  suggestionCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
  },
  suggestionCtaText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
});
