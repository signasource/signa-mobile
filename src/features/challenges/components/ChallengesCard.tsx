import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import type { Challenge, Challenges } from "@/api/challenges";

interface Props {
  challenges: Challenges;
  /** Challenge whose claim is in flight, so its button shows a spinner. */
  claimingId: string | null;
  error: string | null;
  onClaim: (challenge: Challenge) => void;
  onPress: (challenge: Challenge) => void;
}

/**
 * "Primeros pasos" until every step is claimed, then today's daily challenges. The daily ones
 * are the app's main source of gems.
 */
export function ChallengesCard({ challenges, claimingId, error, onClaim, onPress }: Props) {
  const showingFirstSteps = !challenges.firstStepsDone;
  const items = showingFirstSteps ? challenges.firstSteps : challenges.daily;
  if (items.length === 0) return null;

  const doneCount = items.filter((c) => c.rewardClaimed).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{showingFirstSteps ? "Primeros pasos" : "Desafíos del día"}</Text>
        <Text style={styles.meta}>
          {showingFirstSteps ? `${doneCount} / ${items.length}` : renewsIn(challenges.resetsAt)}
        </Text>
      </View>
      <Text style={styles.subtitle}>
        {showingFirstSteps
          ? "Completalos para ganar gemas y desbloquear los desafíos diarios."
          : "Completalos antes de que termine el día y ganá gemas."}
      </Text>

      <View style={styles.rows}>
        {items.map((challenge) => (
          <ChallengeRow
            key={challenge.id}
            challenge={challenge}
            claiming={claimingId === challenge.id}
            onClaim={onClaim}
            onPress={onPress}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function ChallengeRow({
  challenge,
  claiming,
  onClaim,
  onPress,
}: {
  challenge: Challenge;
  claiming: boolean;
  onClaim: (challenge: Challenge) => void;
  onPress: (challenge: Challenge) => void;
}) {
  const { completed, rewardClaimed, progress, target } = challenge;
  const claimable = completed && !rewardClaimed;
  const showBar = target > 1 && !completed;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(challenge)}
      activeOpacity={0.75}
      disabled={completed}
    >
      <View style={[styles.check, completed && styles.checkDone]}>
        {completed ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.rowTitle, rewardClaimed && styles.rowTitleDone]} numberOfLines={2}>
          {challenge.title}
        </Text>
        {showBar ? (
          <View style={styles.progressRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, (progress / target) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.toLocaleString("es-AR")} / {target.toLocaleString("es-AR")}
            </Text>
          </View>
        ) : null}
      </View>

      {claimable ? (
        <TouchableOpacity
          style={styles.claim}
          onPress={() => onClaim(challenge)}
          disabled={claiming}
          activeOpacity={0.85}
        >
          {claiming ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.claimText}>Reclamar</Text>
          )}
        </TouchableOpacity>
      ) : (
        <RewardPill challenge={challenge} muted={rewardClaimed} />
      )}
    </TouchableOpacity>
  );
}

function RewardPill({ challenge, muted }: { challenge: Challenge; muted: boolean }) {
  const { icon, label } = rewardLabel(challenge);
  return (
    <View style={[styles.pill, muted && styles.pillMuted]}>
      <Ionicons name={icon} size={13} color={muted ? colors.textMuted : colors.gemsBlueDark} />
      <Text style={[styles.pillText, muted && styles.pillTextMuted]}>{label}</Text>
    </View>
  );
}

function rewardLabel(challenge: Challenge): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} {
  switch (challenge.rewardType) {
    case "GEMS":
      return { icon: "diamond", label: `+${challenge.rewardQuantity}` };
    case "STREAK_SHIELD":
      return { icon: "shield", label: `+${challenge.rewardQuantity}` };
    case "LIFE":
      return { icon: "heart", label: `+${challenge.rewardQuantity}` };
    case "XP_MULTIPLIER": {
      const multiplier = String(challenge.rewardMultiplierValue ?? 2).replace(".", ",");
      const minutes = challenge.rewardDurationMinutes;
      return { icon: "flash", label: minutes ? `x${multiplier} · ${minutes} min` : `x${multiplier} XP` };
    }
  }
}

/** "Se renuevan en 5 h" / "en 40 min", rounded up so it never reads 0. */
function renewsIn(resetsAt: string): string {
  const minutes = Math.max(1, Math.ceil((new Date(resetsAt).getTime() - Date.now()) / 60000));
  if (minutes < 60) return `Se renuevan en ${minutes} min`;
  return `Se renuevan en ${Math.ceil(minutes / 60)} h`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 17,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  rows: {
    marginTop: 14,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.roadmapLockedBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  rowTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  rowTitleDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.avatarBlueLight,
  },
  pillMuted: {
    backgroundColor: colors.fill,
  },
  pillText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 12,
    color: colors.gemsBlueDark,
  },
  pillTextMuted: {
    color: colors.textMuted,
  },
  claim: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  claimText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  error: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.danger,
    marginTop: 12,
  },
});
