import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from "react-native";
import PictureIllustration from "@assets/ilus/picture.svg";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, Segment } from "@/components/SegmentedControl";
import { SubTabs, SubTab } from "@/components/SubTabs";
import { EmptyState } from "@/components/EmptyState";
import { NavIconButton } from "@/components/BackButton";
import { isLightColor } from "@/utils/color";
import {
  PublicCourseProgress,
  PublicUserProfile,
  publicProfileApi,
  RelationStatus,
  socialApi,
} from "@/api/social";
import { avatarColors, formatXp, initialsOf } from "@/features/social/people";
import { ConfirmSheet, ConfirmSpec } from "@/features/social/components/ConfirmSheet";
import { Toast } from "@/features/social/components/Toast";

type Props = NativeStackScreenProps<AppStackParamList, "PublicProfile">;
type Section = "general" | "cursos" | "logros";
type AchFilter = "unlocked" | "locked";

// ─── constants ────────────────────────────────────────────────
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const ACH_COLS = 3;
const ACH_GUTTER = 14;
const ACH_CELL_WIDTH: DimensionValue = `${100 / ACH_COLS}%`;

const COURSE_COLORS = [colors.courseTeal, colors.primary, colors.shopAmber, colors.gemsBlue];

const SECTIONS: ReadonlyArray<Segment<Section>> = [
  { key: "general", label: "General" },
  { key: "cursos", label: "Cursos" },
  { key: "logros", label: "Logros" },
];

interface DayXp {
  label: string;
  name: string;
  value: number;
  isPast: boolean;
}

// ─── helpers ──────────────────────────────────────────────────
function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function buildWeek(entries: { date: string; xpEarned: number }[]): DayXp[] {
  const today = new Date();
  const todayIdx = getTodayIndex();
  const xpMap = new Map(entries.map((e) => [e.date, e.xpEarned]));
  return DAY_LABELS.map((label, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayIdx + i);
    return {
      label,
      name: DAY_NAMES[i],
      value: xpMap.get(d.toISOString().slice(0, 10)) ?? 0,
      isPast: i <= todayIdx,
    };
  });
}

function primaryAction(
  relation: RelationStatus
): { label: string; icon: keyof typeof Ionicons.glyphMap } | null {
  switch (relation) {
    case "NONE":
      return { label: "Agregar", icon: "person-add" };
    case "OUTGOING":
      return { label: "Cancelar solicitud", icon: "close" };
    case "INCOMING":
      return { label: "Aceptar solicitud", icon: "checkmark" };
    case "FRIEND":
      return { label: "Amigos", icon: "people" };
    case "BLOCKED":
      return { label: "Desbloquear", icon: "lock-open-outline" };
    default:
      return null;
  }
}

interface SectionTitleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  style?: StyleProp<ViewStyle>;
}

function SectionTitle({ icon, label, style }: SectionTitleProps) {
  return (
    <View style={[styles.sectionTitleRow, style]}>
      <Ionicons name={icon} size={17} color={colors.neutral900} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

// ─── main component ───────────────────────────────────────────
export function PublicProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { username } = route.params;
  const todayIdx = getTodayIndex();

  const [activeSection, setActiveSection] = useState<Section>("general");
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIdx);
  const [achFilter, setAchFilter] = useState<AchFilter>("unlocked");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await publicProfileApi.getByUsername(username);
      setProfile(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar este perfil.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const patchRelation = useCallback((relation: RelationStatus) => {
    setProfile((prev) => (prev ? { ...prev, relation } : prev));
  }, []);

  const handlePrimary = useCallback(async () => {
    if (!profile) return;
    if (profile.relation === "FRIEND") {
      setConfirmOpen(true);
      return;
    }
    setBusy(true);
    try {
      switch (profile.relation) {
        case "NONE":
          await socialApi.sendRequest(profile.id);
          patchRelation("OUTGOING");
          notify(`Solicitud enviada a ${profile.name}`);
          break;
        case "OUTGOING":
          await socialApi.cancelRequest(profile.id);
          patchRelation("NONE");
          notify("Cancelaste la solicitud");
          break;
        case "INCOMING":
          await socialApi.acceptRequest(profile.id);
          patchRelation("FRIEND");
          await load();
          break;
        case "BLOCKED":
          await socialApi.unblockUser(profile.id);
          patchRelation("NONE");
          notify(`Desbloqueaste a ${profile.name}`);
          break;
      }
    } catch (err: any) {
      notify(err?.response?.data?.message ?? "No pudimos completar la acción.");
    } finally {
      setBusy(false);
    }
  }, [profile, patchRelation, notify, load]);

  const handleRemoveFriend = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await socialApi.removeFriend(profile.id);
      patchRelation("NONE");
      notify(`Ya no son amigos con ${profile.name}`);
      await load();
    } catch (err: any) {
      notify(err?.response?.data?.message ?? "No pudimos completar la acción.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }, [profile, patchRelation, notify, load]);

  // ─── computed ────────────────────────────────────────────────

  const weekDays = profile ? buildWeek(profile.weeklyXp) : [];
  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[todayIdx];
  const selectedDayName = selectedDayIndex === todayIdx ? "Hoy" : selectedDay?.name ?? "";
  const maxVal = Math.max(...weekDays.slice(0, todayIdx + 1).map((d) => d.value), 1);

  const earnedAch = profile?.achievements.filter((a) => a.earned) ?? [];
  const lockedAch = profile?.achievements.filter((a) => !a.earned) ?? [];
  const achievementsShown = achFilter === "unlocked" ? earnedAch : lockedAch;

  const achFilters: ReadonlyArray<SubTab<AchFilter>> = [
    { key: "unlocked", label: "Conseguidos", count: earnedAch.length },
    { key: "locked", label: "Bloqueados", count: lockedAch.length },
  ];

  const action = profile ? primaryAction(profile.relation) : null;

  const confirmSpec: ConfirmSpec = {
    icon: "person-remove",
    tone: colors.text,
    tint: colors.fill,
    title: "¿Dejar de ser amigos?",
    description:
      "Van a dejar de ver la actividad del otro en el feed. Podés volver a agregarlo cuando quieras.",
    label: "Dejar de ser amigos",
  };

  // ─── render helpers ──────────────────────────────────────────

  function renderHeader() {
    if (!profile) return null;
    const headerColor = profile.profileHeaderColor ?? colors.surface;
    const fg = isLightColor(headerColor) ? colors.neutral900 : colors.onDark;
    const avatar = avatarColors(profile.id);

    return (
      <ScreenHeader
        title={profile.name}
        description={`@${profile.username}`}
        paddingTop={insets.top + 14}
        tone={headerColor}
        stats={[
          {
            key: "streak",
            label: "Racha",
            value: String(profile.stats.currentStreak),
            icon: "flame",
          },
          {
            key: "xp",
            label: "XP total",
            value: formatXp(profile.stats.totalXp),
            icon: "flash",
          },
          {
            key: "rank",
            label: "Ranking",
            value: profile.stats.weeklyRank != null ? `#${profile.stats.weeklyRank}` : "—",
            icon: "ribbon",
          },
        ]}
        left={
          <View style={[styles.avatar, { borderColor: fg, backgroundColor: avatar.bg }]}>
            <Text style={[styles.avatarInitials, { color: avatar.fg }]}>
              {initialsOf(profile.name, profile.username)}
            </Text>
          </View>
        }
        right={
          <NavIconButton
            icon="chevron-back"
            label="Volver"
            color={fg}
            onPress={() => navigation.goBack()}
          />
        }
      />
    );
  }

  function renderGeneral() {
    return (
      <View style={styles.section}>
        {/* Stats */}
        <SectionTitle icon="stats-chart" label="General" />
        <View style={styles.statsGrid}>
          {[
            {
              icon: "flash",
              color: colors.warning,
              value: formatXp(profile!.stats.totalXp),
              label: "XP total",
            },
            {
              icon: "hand-left",
              color: colors.courseTeal,
              value: String(profile!.stats.learnedSignsCount),
              label: "Señas aprendidas",
            },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statChip, { backgroundColor: s.color + "1F" }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Weekly XP chart */}
        <View style={styles.chartHeader}>
          <SectionTitle icon="bar-chart" label="XP de la semana" />
          <Text style={styles.chartSelected}>
            {selectedDayName} · {selectedDay?.value ?? 0} XP
          </Text>
        </View>

        <View style={styles.chartBars}>
          {weekDays.map((d, i) => {
            const isPast = d.isPast;
            const isSelected = i === selectedDayIndex;
            const barH =
              isPast && d.value > 0 ? Math.max(6, (d.value / maxVal) * 68) : isPast ? 4 : 0;
            return (
              <TouchableOpacity
                key={i}
                style={styles.chartCol}
                onPress={() => isPast && setSelectedDayIndex(i)}
                activeOpacity={isPast ? 0.6 : 1}
              >
                <View style={styles.chartColInner}>
                  {isSelected && d.value > 0 && (
                    <Text style={styles.chartDotLabel}>{d.value}</Text>
                  )}
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: barH,
                        backgroundColor: isSelected
                          ? colors.success
                          : isPast
                          ? colors.success + "30"
                          : "transparent",
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.chartBaseline} />
        <View style={styles.chartLabels}>
          {weekDays.map((d, i) => (
            <View key={i} style={styles.chartLabelCol}>
              <Text
                style={[
                  styles.chartDayLabel,
                  i === todayIdx && styles.chartDayLabelToday,
                ]}
              >
                {d.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderCursos() {
    const courses = profile!.courses;
    if (courses.length === 0) {
      return (
        <View style={styles.section}>
          <SectionTitle icon="school" label="Cursos" />
          <EmptyState
            title="Sin cursos todavía"
            description="Cuando empiece un curso va a aparecer acá su progreso."
          />
        </View>
      );
    }
    return (
      <View style={styles.section}>
        <SectionTitle icon="school" label="Cursos" />
        {courses.map((c, i) => {
          const courseColor = COURSE_COLORS[i % COURSE_COLORS.length];
          return (
            <View key={`${c.courseName}:${i}`} style={styles.courseCard}>
              <View style={styles.courseCardTop}>
                <View style={[styles.courseChip, { backgroundColor: courseColor + "1F" }]}>
                  <Ionicons name="school" size={22} color={courseColor} />
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{c.courseName}</Text>
                  <Text style={styles.courseLessons}>
                    {c.completedLessons} de {c.totalLessons} lecciones
                  </Text>
                </View>
                <Text style={[styles.coursePct, { color: courseColor }]}>
                  {c.progressPercentage}%
                </Text>
              </View>

              <View style={styles.courseTrack}>
                <View
                  style={[
                    styles.courseFill,
                    { width: `${c.progressPercentage}%` as any, backgroundColor: courseColor },
                  ]}
                />
              </View>

              {c.currentTopic && (
                <View style={styles.courseUnit}>
                  <View style={styles.courseUnitHeader}>
                    <Text style={styles.courseUnitLabel}>{c.currentTopic.title}</Text>
                    <Text style={styles.courseUnitPct}>
                      {c.currentTopic.progressPercentage}% de la unidad
                    </Text>
                  </View>
                  <View style={styles.courseUnitTrack}>
                    <View
                      style={[
                        styles.courseUnitFill,
                        {
                          width: `${c.currentTopic.progressPercentage}%` as any,
                          backgroundColor: courseColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.courseFooter}>
                <View style={styles.courseMetaItem}>
                  <Ionicons name="hand-left" size={14} color={colors.courseTeal} />
                  <Text style={styles.courseMetaText}>{c.signsLearned} señas</Text>
                </View>
                {c.status === "COMPLETED" && (
                  <View style={[styles.coursePill, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.successDark} />
                    <Text style={[styles.coursePillText, { color: colors.successDark }]}>
                      Completado
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderLogros() {
    return (
      <View style={styles.section}>
        <SectionTitle icon="trophy" label="Logros" />

        <SubTabs options={achFilters} value={achFilter} onChange={setAchFilter} />

        {achievementsShown.length === 0 ? (
          <View style={styles.achEmpty}>
            <PictureIllustration width={178} height={119} />
            <Text style={styles.achEmptyText}>
              {achFilter === "unlocked"
                ? "Todavía no desbloqueó ninguno."
                : "¡Ya desbloqueó todos los logros!"}
            </Text>
          </View>
        ) : (
          <View style={styles.achGrid}>
            {achievementsShown.map((a) => (
              <View key={a.id} style={styles.achItem}>
                <View
                  style={[
                    styles.achBadge,
                    { backgroundColor: a.earned ? colors.warning + "22" : colors.neutral100 },
                  ]}
                >
                  <Ionicons
                    name={a.earned ? "trophy" : "lock-closed"}
                    size={28}
                    color={a.earned ? colors.warning : "#B8B8BD"}
                  />
                  {!a.earned && (
                    <View style={styles.achLock}>
                      <Ionicons name="lock-closed" size={11} color={colors.neutral600} />
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.achName, !a.earned && { color: colors.neutral600 }]}
                  numberOfLines={2}
                >
                  {a.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── main render ─────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {loading ? (
        <>
          <View
            style={[
              styles.loadingHeader,
              { paddingTop: insets.top + 14, minHeight: insets.top + 200 },
            ]}
          >
            <NavIconButton
              icon="chevron-back"
              label="Volver"
              color={colors.neutral900}
              onPress={() => navigation.goBack()}
            />
          </View>
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </>
      ) : error || !profile ? (
        <>
          <View
            style={[
              styles.loadingHeader,
              { paddingTop: insets.top + 14, minHeight: insets.top + 200 },
            ]}
          >
            <NavIconButton
              icon="chevron-back"
              label="Volver"
              color={colors.neutral900}
              onPress={() => navigation.goBack()}
            />
          </View>
          <View style={styles.errorWrap}>
            <EmptyState
              title="Perfil no disponible"
              description={error ?? "No encontramos a esta persona."}
            />
          </View>
        </>
      ) : (
        <>
          {renderHeader()}

          {/* Friend action button */}
          {action && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handlePrimary}
                disabled={busy}
                activeOpacity={0.86}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.onDark} />
                ) : (
                  <>
                    <Ionicons name={action.icon} size={15} color={colors.onDark} />
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {profile.visible && (
            <SegmentedControl
              options={SECTIONS}
              value={activeSection}
              onChange={setActiveSection}
            />
          )}

          {!profile.visible ? (
            <View style={styles.privateWrap}>
              <EmptyState
                title="Esta cuenta es privada"
                description="Solo sus amigos pueden ver su progreso, sus cursos y sus logros."
              />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeSection === "general" && renderGeneral()}
              {activeSection === "cursos" && renderCursos()}
              {activeSection === "logros" && renderLogros()}
            </ScrollView>
          )}
        </>
      )}

      <Toast message={toast} bottom={insets.bottom + 16} />

      <ConfirmSheet
        spec={confirmOpen ? confirmSpec : null}
        busy={busy}
        onConfirm={handleRemoveFriend}
        onClose={() => setConfirmOpen(false)}
      />
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Avatar (same size and shape as ProfileScreen's own avatar)
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 23,
    color: colors.primary,
  },

  // Loading / error states
  loadingHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // Friend action
  actionRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  actionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
  },

  // Private account
  privateWrap: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Common section
  section: {
    padding: 20,
    paddingBottom: 28,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 17,
    color: colors.neutral900,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral200,
    marginVertical: 24,
  },

  // Stats (matches ProfileScreen exactly)
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  statChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.neutral900,
    lineHeight: 22,
  },
  statLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.neutral600,
    lineHeight: 15,
  },

  // Weekly XP chart (matches ProfileScreen exactly)
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartSelected: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.success,
  },
  chartBars: {
    height: 80,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: 80,
  },
  chartColInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    width: "100%",
  },
  chartBar: {
    width: "55%",
    borderRadius: 3,
  },
  chartDotLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.success,
    marginBottom: 2,
  },
  chartBaseline: {
    height: 1,
    backgroundColor: colors.neutral200,
    marginTop: 4,
  },
  chartLabels: {
    flexDirection: "row",
    marginTop: 4,
  },
  chartLabelCol: {
    flex: 1,
    alignItems: "center",
  },
  chartDayLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
  },
  chartDayLabelToday: {
    fontFamily: fonts.bodyBold,
    color: colors.neutral900,
  },

  // Courses (matches ProfileScreen exactly)
  courseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  courseCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  courseChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  courseInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  courseName: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.neutral900,
    lineHeight: 20,
  },
  courseLessons: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
  },
  coursePct: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    flexShrink: 0,
  },
  courseTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral100,
    overflow: "hidden",
    marginTop: 14,
  },
  courseFill: {
    height: "100%",
    borderRadius: 4,
  },
  courseUnit: {
    backgroundColor: colors.neutral100,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  courseUnitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseUnitLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.neutral900,
  },
  courseUnitPct: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.neutral600,
  },
  courseUnitTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  courseUnitFill: {
    height: "100%",
    borderRadius: 3,
    opacity: 0.7,
  },
  courseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },
  courseMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courseMetaText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
  },
  coursePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  coursePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
  },

  // Achievements — three responsive columns (matches ProfileScreen exactly)
  achEmpty: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 38,
  },
  achEmptyText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.neutral900,
    textAlign: "center",
  },
  achGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    marginHorizontal: -ACH_GUTTER / 2,
  },
  achItem: {
    width: ACH_CELL_WIDTH,
    paddingHorizontal: ACH_GUTTER / 2,
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  achBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  achLock: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  achName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.neutral900,
    textAlign: "center",
    lineHeight: 14,
  },
});
