import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { EmptyState } from "@/components/EmptyState";
import { SubTabs, SubTab } from "@/components/SubTabs";
import { colors, fonts } from "@/theme";
import { RankingEntry, socialApi, WeeklyRanking } from "@/api/social";
import { formatXp } from "@/features/social/people";
import { Avatar } from "./Avatar";

type Scope = "global" | "amigos";

const SCOPE_TABS: ReadonlyArray<SubTab<Scope>> = [
  { key: "global", label: "Global" },
  { key: "amigos", label: "Amigos" },
];

interface Props {
  onPressUser: (username: string) => void;
  /** Reports the caller's global position so the header tile can show it. */
  onGlobalRank?: (rank: number | null) => void;
}

function Delta({ value }: { value: number | null }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <View style={styles.delta}>
      <Ionicons
        name={up ? "caret-up" : "caret-down"}
        size={11}
        color={up ? colors.success : colors.danger}
      />
      <Text style={[styles.deltaLabel, { color: up ? colors.success : colors.danger }]}>
        {Math.abs(value)}
      </Text>
    </View>
  );
}

function Row({ entry, onPress }: { entry: RankingEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.rank, entry.rank <= 3 && styles.rankTop]}>{entry.rank}</Text>
      <Avatar id={entry.id} name={entry.name} username={entry.username} size={38} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          @{entry.username} · 🔥 {entry.currentStreak}
        </Text>
      </View>
      <Delta value={entry.delta} />
      <Text style={styles.xp}>{formatXp(entry.weeklyXp)} XP</Text>
    </TouchableOpacity>
  );
}

/** Weekly XP leaderboard: global top 100 or the caller's friends. */
export function RankingView({ onPressUser, onGlobalRank }: Props) {
  const [scope, setScope] = useState<Scope>("global");
  const [data, setData] = useState<WeeklyRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await (scope === "global"
        ? socialApi.getGlobalRanking()
        : socialApi.getFriendsRanking());
      setData(res.data);
      if (scope === "global") onGlobalRank?.(res.data.me?.rank ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar el ranking.");
    } finally {
      setLoading(false);
    }
  }, [scope, onGlobalRank]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <SubTabs options={SCOPE_TABS} value={scope} onChange={setScope} />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.socialWine} />
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState title="No pudimos cargar" description={error} />
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryLabel}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : data && data.entries.length > 0 ? (
        <>
          {data.me && (
            <View style={styles.me}>
              <Text style={styles.meRank}>#{data.me.rank}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>Tu posición esta semana</Text>
                {data.me.gapText && <Text style={styles.sub}>{data.me.gapText}</Text>}
              </View>
              <Delta value={data.me.delta} />
              <Text style={styles.xp}>{formatXp(data.me.weeklyXp)} XP</Text>
            </View>
          )}
          {data.entries.map((entry) => (
            <Row key={entry.id} entry={entry} onPress={() => onPressUser(entry.username)} />
          ))}
        </>
      ) : (
        <EmptyState
          title="Todavía no hay ranking"
          description={
            scope === "amigos"
              ? "Sumá amigos y ganá XP esta semana para aparecer acá."
              : "Completá lecciones esta semana para entrar al ranking."
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 6 },
  loader: { marginTop: 40 },
  centered: { alignItems: "center", gap: 12 },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.fill,
  },
  retryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  me: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.socialWineLight,
  },
  meRank: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.socialWine },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 26,
    textAlign: "center",
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  rankTop: { color: colors.shopAmber },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  xp: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  delta: { flexDirection: "row", alignItems: "center", gap: 2 },
  deltaLabel: { fontFamily: fonts.bodyBold, fontSize: 11 },
});
