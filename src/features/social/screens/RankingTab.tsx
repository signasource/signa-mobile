import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { EmptyState } from "@/components/EmptyState";
import { colors, fonts } from "@/theme";
import { rankingApi, RankingEntry, WeeklyRanking } from "@/api/ranking";
import { usersApi, UserProfile } from "@/api/users";
import { avatarColors, initialsOf, formatXp } from "@/features/social/people";

// ─── Countdown ──────────────────────────────────────────────────────────────

function formatCountdown(nowMs: number): string {
  const now = new Date(nowMs);
  const next = new Date(now);
  const day = now.getDay();
  // days until next Monday; if already Monday treat as 7 days away
  const daysToMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  next.setDate(now.getDate() + daysToMonday);
  next.setHours(0, 0, 0, 0);

  let s = Math.max(0, Math.floor((next.getTime() - nowMs) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function useCountdown() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return formatCountdown(now);
}

// ─── Delta badge ─────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const flat = delta === 0;
  const up = delta > 0;
  return (
    <View
      style={[
        styles.delta,
        {
          backgroundColor: flat
            ? colors.fill
            : up
              ? colors.successLight
              : colors.dangerLight,
        },
      ]}
    >
      <Ionicons
        name={flat ? "remove" : up ? "arrow-up" : "arrow-down"}
        size={11}
        color={flat ? colors.textMuted : up ? colors.successDark : colors.danger}
      />
      <Text
        style={[
          styles.deltaText,
          { color: flat ? colors.textMuted : up ? colors.successDark : colors.danger },
        ]}
      >
        {flat ? "—" : String(Math.abs(delta))}
      </Text>
    </View>
  );
}

// ─── Podium ──────────────────────────────────────────────────────────────────

const RING = ["#FBBF24", "#86868B", "#DE7211"]; // gold · silver · bronze
const BAR_H = [40, 26, 18];
const BAR_BG = ["#FEF3D6", "#F2F2F3", "#FBE4C8"];
const PODIUM_ORDER = [1, 0, 2]; // 2nd · 1st · 3rd (visual arrangement)

function Podium({ entries, onPressProfile }: { entries: RankingEntry[]; onPressProfile: (username: string) => void }) {
  if (entries.length === 0) return null;

  // 3 entries → 2nd · 1st · 3rd visual arrangement; fewer → rank order
  const displayOrder =
    entries.length >= 3 ? PODIUM_ORDER : entries.map((_, i) => i);

  return (
    <View style={styles.podiumCard}>
      {displayOrder.map((idx) => {
        const entry = entries[idx];
        const { bg, fg } = avatarColors(entry.id);
        const isFirst = idx === 0;
        const avatarSize = isFirst ? 60 : 50;
        const initialsFs = isFirst ? 20 : 16;
        return (
          <View key={entry.id} style={styles.podiumCol}>
            <TouchableOpacity
              style={styles.podiumAvatarWrap}
              onPress={() => onPressProfile(entry.username)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Ver el perfil de ${entry.name}`}
            >
              <View
                style={[
                  styles.podiumAvatar,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                    backgroundColor: bg,
                    borderColor: RING[idx],
                  },
                ]}
              >
                <Text style={[styles.podiumInitials, { color: fg, fontSize: initialsFs }]}>
                  {initialsOf(entry.name, entry.username)}
                </Text>
              </View>
              <View style={[styles.rankBadge, { backgroundColor: RING[idx] }]}>
                <Text style={styles.rankBadgeLabel}>{entry.rank}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.podiumName} numberOfLines={1}>
              {entry.name.split(" ")[0]}
            </Text>
            <View style={styles.podiumXpRow}>
              <Ionicons name="flash" size={12} color={colors.shopAmber} />
              <Text style={styles.podiumXp}>{formatXp(entry.weeklyXp)}</Text>
            </View>
            <View
              style={[styles.podiumBar, { height: BAR_H[idx], backgroundColor: BAR_BG[idx] }]}
            />
          </View>
        );
      })}
    </View>
  );
}

// ─── List row ────────────────────────────────────────────────────────────────

function RankRow({ entry, onPressProfile }: { entry: RankingEntry; onPressProfile: (username: string) => void }) {
  const { bg, fg } = avatarColors(entry.id);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPressProfile(entry.username)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Ver el perfil de ${entry.name}`}
    >
      <Text style={styles.rowRank}>{entry.rank}</Text>
      <View style={[styles.rowAvatar, { backgroundColor: bg }]}>
        <Text style={[styles.rowInitials, { color: fg }]}>
          {initialsOf(entry.name, entry.username)}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.name}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowHandle} numberOfLines={1}>
            @{entry.username}
          </Text>
          <View style={styles.streakWrap}>
            <Ionicons name="flame" size={13} color={colors.streakOrange} />
            <Text style={styles.streakLabel}>{entry.currentStreak}</Text>
          </View>
        </View>
      </View>
      <View style={styles.rowRight}>
        <DeltaBadge delta={entry.delta} />
        <Text style={styles.rowXp}>{formatXp(entry.weeklyXp)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Me bar ──────────────────────────────────────────────────────────────────

function MeBar({ me, myName, myUsername }: {
  me: WeeklyRanking["me"];
  myName: string;
  myUsername: string;
}) {
  return (
    <View style={styles.meBar}>
      <Text style={styles.meRank}>#{me.rank}</Text>
      <View style={styles.meAvatar}>
        <Text style={styles.meInitials}>{initialsOf(myName, myUsername)}</Text>
      </View>
      <View style={styles.meInfo}>
        <Text style={styles.meName}>Vos</Text>
        {me.gapText ? (
          <Text style={styles.meGap} numberOfLines={1}>
            {me.gapText}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <DeltaBadge delta={me.delta} />
        <Text style={styles.rowXp}>{formatXp(me.weeklyXp)}</Text>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Scope = "global" | "friends";

interface RankingTabProps {
  onPressProfile: (username: string) => void;
}

export function RankingTab({ onPressProfile }: RankingTabProps) {
  const countdown = useCountdown();
  const [scope, setScope] = useState<Scope>("global");
  const [globalRanking, setGlobalRanking] = useState<WeeklyRanking | null>(null);
  const [friendsRanking, setFriendsRanking] = useState<WeeklyRanking | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [globalRes, friendsRes, profileRes] = await Promise.all([
        rankingApi.getGlobal(),
        rankingApi.getFriends(),
        usersApi.getMe(),
      ]);
      setGlobalRanking(globalRes.data);
      setFriendsRanking(friendsRes.data);
      setMyProfile(profileRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar el ranking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = scope === "global" ? globalRanking : friendsRanking;
  const globalTotal = globalRanking?.total ?? 0;
  const friendsTotal = friendsRanking?.total ?? 0;
  const myName = myProfile?.name ?? "";
  const myUsername = myProfile?.username ?? "";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.socialWine} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <EmptyState title="No pudimos cargar" description={error ?? ""} />
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryLabel}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const podiumCount = Math.min(data.entries.length, 3);
  const podiumEntries = data.entries.slice(0, podiumCount);
  const restEntries = data.entries.slice(podiumCount);
  const scopeLabel = scope === "global" ? "TOP 100 GLOBAL" : "MIS AMIGOS";

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scope toggle */}
        <View style={styles.scopeToggle}>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === "global" && styles.scopeBtnActive]}
            onPress={() => setScope("global")}
            activeOpacity={0.85}
          >
            <Text style={[styles.scopeLabel, scope === "global" && styles.scopeLabelActive]}>
              Global
            </Text>
            <Text style={[styles.scopeCount, scope === "global" && styles.scopeLabelActive]}>
              {globalTotal}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === "friends" && styles.scopeBtnActive]}
            onPress={() => setScope("friends")}
            activeOpacity={0.85}
          >
            <Text style={[styles.scopeLabel, scope === "friends" && styles.scopeLabelActive]}>
              Mis amigos
            </Text>
            <Text style={[styles.scopeCount, scope === "friends" && styles.scopeLabelActive]}>
              {friendsTotal}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Countdown */}
        <View style={styles.countdownRow}>
          <Ionicons name="time-outline" size={17} color={colors.socialWine} />
          <Text style={styles.countdownLabel}>Se reinicia el lunes a las 00:00</Text>
          <Text style={styles.countdownValue}>{countdown}</Text>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>XP DE ESTA SEMANA · {scopeLabel}</Text>

        {/* Podium */}
        <Podium entries={podiumEntries} onPressProfile={onPressProfile} />

        {/* Rest of list */}
        {restEntries.map((entry) => (
          <RankRow key={entry.id} entry={entry} onPressProfile={onPressProfile} />
        ))}

        {/* Footer */}
        <Text style={styles.footNote}>
          {scope === "global"
            ? `Mostramos los primeros 100 de la semana. El XP se acumula de lunes a domingo.`
            : `Solo vos y tus ${friendsTotal} amigos. El XP se acumula de lunes a domingo.`}
        </Text>
      </ScrollView>

      {/* Sticky me bar */}
      <MeBar me={data.me} myName={myName} myUsername={myUsername} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  retry: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: colors.text,
  },
  retryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },

  // Scope toggle
  scopeToggle: {
    flexDirection: "row",
    backgroundColor: colors.neutral100,
    borderRadius: 14,
    padding: 4,
    marginTop: 6,
    marginBottom: 14,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 36,
    borderRadius: 11,
    paddingHorizontal: 10,
  },
  scopeBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  scopeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  scopeLabelActive: {
    color: colors.text,
  },
  scopeCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
    opacity: 0.7,
  },

  // Countdown
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  countdownLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  countdownValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    paddingHorizontal: 2,
    paddingBottom: 6,
  },

  // Podium card
  podiumCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  podiumAvatarWrap: {
    position: "relative",
    alignItems: "center",
  },
  podiumAvatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
  },
  podiumInitials: {
    fontFamily: fonts.displayExtraBold,
  },
  rankBadge: {
    position: "absolute",
    bottom: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.surface,
  },
  podiumName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
    maxWidth: 96,
  },
  podiumXpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  podiumXp: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.text,
  },
  podiumBar: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  // List row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowRank: {
    width: 22,
    textAlign: "right",
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
  },
  rowHandle: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  streakWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  rowXp: {
    minWidth: 44,
    textAlign: "right",
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.text,
  },

  // Delta badge
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 7,
  },
  deltaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },

  // Footer note
  footNote: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    lineHeight: 17,
  },

  // Me bar
  meBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.socialWineLight,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  meRank: {
    width: 22,
    textAlign: "right",
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.socialWine,
  },
  meAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.socialWine,
  },
  meInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
    color: colors.socialWine,
  },
  meInfo: {
    flex: 1,
    minWidth: 0,
  },
  meName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  meGap: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.socialWine,
    marginTop: 3,
  },
});
