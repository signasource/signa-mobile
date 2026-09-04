import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import {
  PublicAchievement,
  PublicCourseProgress,
  PublicUserProfile,
  publicProfileApi,
  RelationStatus,
  socialApi,
} from "@/api/social";
import { avatarColors, formatXp, initialsOf } from "@/features/social/people";
import { EmptyState } from "@/features/social/components/EmptyState";
import { ConfirmSheet, ConfirmSpec } from "@/features/social/components/ConfirmSheet";
import { Toast } from "@/features/social/components/Toast";

type Props = NativeStackScreenProps<AppStackParamList, "PublicProfile">;
type Section = "general" | "cursos" | "logros";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SECTIONS: { key: Section; icon: string; iconActive: string }[] = [
  { key: "general", icon: "person-outline", iconActive: "person" },
  { key: "cursos", icon: "school-outline", iconActive: "school" },
  { key: "logros", icon: "trophy-outline", iconActive: "trophy" },
];

/** The backend sends no course colour, so it comes from the list position. */
const COURSE_COLORS = [colors.courseTeal, colors.primary, colors.shopAmber, colors.gemsBlue];

interface DayXp {
  label: string;
  name: string;
  value: number;
  isPast: boolean;
}

// ─── helpers ──────────────────────────────────────────────────
/** Relative luminance, to pick light or dark text over the header. */
function getLum(hex: string): number {
  const parse = (s: string) => parseInt(s, 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(parse(hex.slice(1, 3)));
  const g = toLinear(parse(hex.slice(3, 5)));
  const b = toLinear(parse(hex.slice(5, 7)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLight(hex: string): boolean {
  return getLum(hex) > 0.42;
}

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

function primaryAction(relation: RelationStatus): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive: boolean;
} | null {
  switch (relation) {
    case "NONE":
      return { label: "Agregar", icon: "person-add", destructive: false };
    case "OUTGOING":
      return { label: "Cancelar solicitud", icon: "close", destructive: false };
    case "INCOMING":
      return { label: "Aceptar solicitud", icon: "checkmark", destructive: false };
    case "FRIEND":
      return { label: "Amigos", icon: "people", destructive: true };
    case "BLOCKED":
      return { label: "Desbloquear", icon: "lock-open-outline", destructive: false };
    default:
      return null;
  }
}

// ─── main component ───────────────────────────────────────────
export function PublicProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { username } = route.params;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("general");
  const [selectedDayIndex, setSelectedDayIndex] = useState(getTodayIndex());
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

    // Unfriending is confirmed first; everything else applies straight away.
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <EmptyState
          icon="person-circle-outline"
          title="Perfil no disponible"
          description={error ?? "No encontramos a esta persona."}
        />
        <TouchableOpacity style={styles.retry} onPress={() => navigation.goBack()}>
          <Text style={styles.retryLabel}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerColor = profile.profileHeaderColor ?? colors.surface;
  const headerLight = isLight(headerColor);
  const onHeader = headerLight ? colors.neutral900 : colors.surface;
  const onHeaderSoft = headerLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.74)";
  const headerBorderColor = headerLight ? colors.neutral200 : "rgba(255,255,255,0.16)";
  const pillBg = headerLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.20)";

  const avatar = avatarColors(profile.id);
  const action = primaryAction(profile.relation);
  const todayIdx = getTodayIndex();
  const weekDays = buildWeek(profile.weeklyXp);
  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[todayIdx];
  const maxVal = Math.max(...weekDays.slice(0, todayIdx + 1).map((d) => d.value), 1);

  const confirmSpec: ConfirmSpec = {
    icon: "person-remove",
    tone: colors.text,
    tint: colors.fill,
    title: "¿Dejar de ser amigos?",
    description:
      "Van a dejar de ver la actividad del otro en el feed. Podés volver a agregarlo cuando quieras.",
    label: "Dejar de ser amigos",
  };

  return (
    <View style={styles.container}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={styles.scrollContent}>
        {/* ─── header ─────────────────────────────────────── */}
        <View style={{ backgroundColor: headerColor }}>
          <View style={{ paddingTop: insets.top }}>
            <View style={styles.titleBar}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <Ionicons name="arrow-back" size={23} color={onHeader} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: onHeader }]}>Perfil</Text>
              <View style={styles.iconBtn} />
            </View>

            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <View
                  style={[styles.avatar, { borderColor: onHeader, backgroundColor: avatar.bg }]}
                >
                  <Text style={[styles.avatarInitials, { color: avatar.fg }]}>
                    {initialsOf(profile.name, profile.username)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.streakBadge,
                    {
                      backgroundColor:
                        profile.stats.currentStreak > 0
                          ? colors.streakOrange
                          : colors.neutral600,
                    },
                  ]}
                >
                  <Ionicons name="flame" size={14} color={colors.surface} />
                  <Text style={styles.streakDays}>{profile.stats.currentStreak}</Text>
                </View>
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: onHeader }]} numberOfLines={1}>
                  {profile.name}
                </Text>
                <View style={styles.usernameRow}>
                  <Ionicons name="at-outline" size={14} color={onHeaderSoft} />
                  <Text style={[styles.usernameText, { color: onHeaderSoft }]}>
                    {profile.username}
                  </Text>
                </View>

                {action && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: pillBg }]}
                    onPress={handlePrimary}
                    disabled={busy}
                    activeOpacity={0.7}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={onHeader} />
                    ) : (
                      <>
                        <Ionicons name={action.icon} size={14} color={onHeader} />
                        <Text style={[styles.actionLabel, { color: onHeader }]}>
                          {action.label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {profile.visible && (
            <View style={[styles.sectionBar, { borderBottomColor: headerBorderColor }]}>
              {SECTIONS.map((s) => {
                const active = s.key === section;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sectionTab, active && { borderBottomColor: onHeader }]}
                    onPress={() => setSection(s.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={(active ? s.iconActive : s.icon) as any}
                      size={23}
                      color={
                        headerLight
                          ? active
                            ? colors.neutral900
                            : "#B8B8BD"
                          : active
                          ? colors.surface
                          : "rgba(255,255,255,0.6)"
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── body ───────────────────────────────────────── */}
        {!profile.visible ? (
          <View style={styles.section}>
            <EmptyState
              icon="lock-closed-outline"
              title="Esta cuenta es privada"
              description="Solo sus amigos pueden ver su progreso, sus cursos y sus logros."
            />
          </View>
        ) : section === "general" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            <View style={styles.statsGrid}>
              {[
                {
                  icon: "flash",
                  color: colors.warning,
                  value: formatXp(profile.stats.totalXp),
                  label: "XP total",
                },
                {
                  icon: "hand-left",
                  color: colors.courseTeal,
                  value: String(profile.stats.learnedSignsCount),
                  label: "Señas aprendidas",
                },
                {
                  icon: "flame",
                  color: colors.streakOrange,
                  value: String(profile.stats.currentStreak),
                  label: "Racha actual",
                },
                {
                  icon: "trophy",
                  color: colors.primary,
                  value: String(profile.stats.longestStreak),
                  label: "Mejor racha",
                },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statChip, { backgroundColor: s.color + "1F" }]}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <View style={styles.statText}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>XP de la semana</Text>
              <Text style={styles.chartSelected}>
                {selectedDay?.name} · {selectedDay?.value ?? 0} XP
              </Text>
            </View>

            <View style={styles.chartBars}>
              {weekDays.map((d, i) => {
                const isSelected = i === selectedDayIndex;
                const barH = d.isPast && d.value > 0 ? Math.max(6, (d.value / maxVal) * 68) : d.isPast ? 4 : 0;
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.chartCol}
                    onPress={() => d.isPast && setSelectedDayIndex(i)}
                    activeOpacity={d.isPast ? 0.6 : 1}
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
                              : d.isPast
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
                    style={[styles.chartDayLabel, i === todayIdx && styles.chartDayLabelToday]}
                  >
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : section === "cursos" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cursos</Text>
            {profile.courses.length === 0 ? (
              <EmptyState
                icon="school-outline"
                title="Sin cursos todavía"
                description="Cuando empiece un curso vas a ver su progreso acá."
              />
            ) : (
              profile.courses.map((course, i) => (
                <CourseCard
                  key={`${course.courseName}:${i}`}
                  course={course}
                  color={COURSE_COLORS[i % COURSE_COLORS.length]}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logros</Text>
            <AchievementList achievements={profile.achievements} />
          </View>
        )}
      </ScrollView>

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

// ─── sub-components ───────────────────────────────────────────
function CourseCard({ course, color }: { course: PublicCourseProgress; color: string }) {
  return (
    <View style={styles.courseCard}>
      <View style={styles.courseCardTop}>
        <View style={[styles.courseChip, { backgroundColor: color + "1F" }]}>
          <Ionicons name="school" size={22} color={color} />
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{course.courseName}</Text>
          <Text style={styles.courseLessons}>
            {course.completedLessons} de {course.totalLessons} lecciones
          </Text>
        </View>
        <Text style={[styles.coursePct, { color }]}>{course.progressPercentage}%</Text>
      </View>

      <View style={styles.courseTrack}>
        <View
          style={[
            styles.courseFill,
            { width: `${course.progressPercentage}%` as any, backgroundColor: color },
          ]}
        />
      </View>

      {course.currentTopic && (
        <View style={styles.courseUnit}>
          <View style={styles.courseUnitHeader}>
            <Text style={styles.courseUnitLabel}>{course.currentTopic.title}</Text>
            <Text style={styles.courseUnitPct}>
              {course.currentTopic.progressPercentage}% de la unidad
            </Text>
          </View>
          <View style={styles.courseUnitTrack}>
            <View
              style={[
                styles.courseUnitFill,
                {
                  width: `${course.currentTopic.progressPercentage}%` as any,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.courseFooter}>
        <View style={styles.courseMetaItem}>
          <Ionicons name="hand-left" size={14} color={colors.courseTeal} />
          <Text style={styles.courseMetaText}>{course.signsLearned} señas</Text>
        </View>
        {course.status === "COMPLETED" && (
          <View style={[styles.coursePill, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={13} color={colors.successDark} />
            <Text style={[styles.coursePillText, { color: colors.successDark }]}>Completado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function AchievementList({ achievements }: { achievements: PublicAchievement[] }) {
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (achievements.length === 0) {
    return (
      <EmptyState
        icon="trophy-outline"
        title="Sin logros todavía"
        description="Cuando desbloquee su primer logro vas a verlo acá."
      />
    );
  }

  return (
    <View>
      <Text style={styles.groupLabel}>DESBLOQUEADOS · {earned.length}</Text>
      {earned.length === 0 ? (
        <Text style={styles.groupEmpty}>Todavía no desbloqueó ninguno.</Text>
      ) : (
        earned.map((a) => <AchievementRow key={a.id} achievement={a} />)
      )}

      {locked.length > 0 && (
        <>
          <Text style={[styles.groupLabel, styles.groupLabelSpaced]}>
            PENDIENTES · {locked.length}
          </Text>
          {locked.map((a) => (
            <AchievementRow key={a.id} achievement={a} />
          ))}
        </>
      )}
    </View>
  );
}

function AchievementRow({ achievement }: { achievement: PublicAchievement }) {
  const tone = achievement.earned ? colors.warning : colors.neutral600;
  const tint = achievement.earned ? colors.warningLight : colors.neutral100;

  return (
    <View style={[styles.achRow, !achievement.earned && styles.achRowLocked]}>
      <View style={[styles.achChip, { backgroundColor: tint }]}>
        <Ionicons name={achievement.earned ? "trophy" : "lock-closed"} size={19} color={tone} />
      </View>
      <View style={styles.achInfo}>
        <Text style={styles.achTitle}>{achievement.title}</Text>
        <Text style={styles.achDesc}>{achievement.description}</Text>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  retry: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
  },
  retryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  avatarWrap: {
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: -10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  streakDays: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.surface,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: fonts.displayBold,
    fontSize: 21,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  usernameText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 10,
    height: 32,
    minWidth: 110,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
  sectionBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  sectionTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.neutral900,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 12,
  },
  statChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.neutral900,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.neutral600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral200,
    marginVertical: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartSelected: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.neutral600,
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  chartColInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },
  chartDotLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.successDark,
    marginBottom: 4,
  },
  chartBar: {
    width: 22,
    borderRadius: 6,
  },
  chartBaseline: {
    height: 1,
    backgroundColor: colors.neutral200,
  },
  chartLabels: {
    flexDirection: "row",
    marginTop: 6,
  },
  chartLabelCol: {
    flex: 1,
    alignItems: "center",
  },
  chartDayLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.neutral600,
  },
  chartDayLabelToday: {
    fontFamily: fonts.bodyBold,
    color: colors.neutral900,
  },
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 14,
    marginBottom: 12,
  },
  courseCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  courseChip: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  courseInfo: {
    flex: 1,
    minWidth: 0,
  },
  courseName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.neutral900,
  },
  courseLessons: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 2,
  },
  coursePct: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  courseTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral100,
    marginTop: 12,
    overflow: "hidden",
  },
  courseFill: {
    height: "100%",
    borderRadius: 4,
  },
  courseUnit: {
    marginTop: 14,
  },
  courseUnitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseUnitLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.neutral900,
  },
  courseUnitPct: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.neutral600,
  },
  courseUnitTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.neutral100,
    marginTop: 6,
    overflow: "hidden",
  },
  courseUnitFill: {
    height: "100%",
    borderRadius: 3,
  },
  courseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  courseMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  courseMetaText: {
    fontFamily: fonts.bodyMedium,
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
  groupLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.neutral600,
    marginBottom: 8,
  },
  groupLabelSpaced: {
    marginTop: 20,
  },
  groupEmpty: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.neutral600,
    marginBottom: 8,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral200,
    padding: 12,
    marginBottom: 8,
  },
  achRowLocked: {
    opacity: 0.55,
  },
  achChip: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  achInfo: {
    flex: 1,
    minWidth: 0,
  },
  achTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral900,
  },
  achDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.neutral600,
    marginTop: 2,
  },
});
