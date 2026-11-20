import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { SubTabs, SubTab } from "@/components/SubTabs";
import { ProfileMetrics, usersApi } from "@/api/users";
import { colors, fonts } from "@/theme";
import { CalendarModal } from "./CalendarModal";
import { addDays, formatShort, toIso } from "./dateRange";

type Preset = "7d" | "30d" | "month" | "custom";

const PRESETS: readonly SubTab<Preset>[] = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
  { key: "custom", label: "Otro" },
];

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const today = new Date();
  const to = toIso(today);
  if (preset === "7d") return { from: toIso(addDays(today, -6)), to };
  if (preset === "30d") return { from: toIso(addDays(today, -29)), to };
  return { from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to };
}

/** XP, learned signs and days the daily goal was met, for a from/to range chosen by the user. */
export function MetricsRange() {
  const [preset, setPreset] = useState<Preset>("7d");
  const [range, setRange] = useState(() => presetRange("7d"));
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toIso(new Date());

  const load = useCallback(async (from: string, to: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await usersApi.getMetrics(from, to);
      setMetrics(res.data);
    } catch (err: any) {
      setMetrics(null);
      setError(err?.response?.data?.message ?? "No pudimos cargar tus métricas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range.from, range.to);
  }, [range, load]);

  function choosePreset(next: Preset) {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next));
  }

  function pickDate(iso: string) {
    const side = picking;
    setPicking(null);
    if (side === "from") setRange((r) => ({ from: iso, to: r.to < iso ? iso : r.to }));
    else if (side === "to") setRange((r) => ({ from: r.from > iso ? iso : r.from, to: iso }));
  }

  const goalPct =
    metrics && metrics.totalDays > 0
      ? Math.round((metrics.daysGoalReached / metrics.totalDays) * 100)
      : 0;

  return (
    <View>
      <SubTabs options={PRESETS} value={preset} onChange={choosePreset} />

      <View style={styles.dates}>
        {(["from", "to"] as const).map((side) => (
          <TouchableOpacity
            key={side}
            style={styles.dateBtn}
            onPress={() => {
              setPreset("custom");
              setPicking(side);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateLabel}>{side === "from" ? "Desde" : "Hasta"}</Text>
            <View style={styles.dateValueRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.neutral600} />
              <Text style={styles.dateValue}>{formatShort(range[side])}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !metrics ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <TouchableOpacity onPress={() => load(range.from, range.to)} activeOpacity={0.7}>
          <Text style={styles.error}>{error} Tocá para reintentar.</Text>
        </TouchableOpacity>
      ) : metrics ? (
        <View style={[styles.results, loading && styles.resultsLoading]}>
          <View style={styles.row}>
            <View style={styles.statCard}>
              <Ionicons name="flash" size={18} color={colors.warning} />
              <Text style={styles.statValue}>{metrics.xpEarned.toLocaleString("es-AR")}</Text>
              <Text style={styles.statLabel}>XP ganada</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="hand-left" size={18} color={colors.courseTeal} />
              <Text style={styles.statValue}>{metrics.signsLearned}</Text>
              <Text style={styles.statLabel}>Señas aprendidas</Text>
            </View>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalTop}>
              <Text style={styles.goalTitle}>Meta diaria cumplida</Text>
              <Text style={styles.goalCount}>
                {metrics.daysGoalReached} de {metrics.totalDays}{" "}
                {metrics.totalDays === 1 ? "día" : "días"}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${goalPct}%` }]} />
            </View>
            <Text style={styles.goalHint}>
              Según tu meta actual de {metrics.dailyGoalMinutes} min por día.
            </Text>
          </View>
        </View>
      ) : null}

      <CalendarModal
        key={picking ?? "closed"}
        visible={picking !== null}
        title={picking === "from" ? "Desde" : "Hasta"}
        value={picking === "to" ? range.to : range.from}
        max={today}
        onSelect={pickDate}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: "row", gap: 10, marginTop: 12 },
  dateBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateLabel: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.neutral600 },
  dateValueRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dateValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.neutral900 },
  loader: { marginVertical: 24 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral600, marginTop: 16 },
  results: { marginTop: 12, gap: 10 },
  resultsLoading: { opacity: 0.5 },
  row: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.neutral900 },
  statLabel: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.neutral600 },
  goalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.neutral900 },
  goalCount: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.streakOrange },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.neutral100, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.streakOrange },
  goalHint: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.neutral600 },
});
