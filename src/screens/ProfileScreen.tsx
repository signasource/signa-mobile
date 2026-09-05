import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  DimensionValue,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabParamList } from "@/navigation/TabNavigator";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, Segment } from "@/components/SegmentedControl";
import { SubTabs, SubTab } from "@/components/SubTabs";
import { EmptyState } from "@/components/EmptyState";
import { NavIconButton } from "@/components/BackButton";
import { isLightColor } from "@/utils/color";
import { useAuth } from "@/context/AuthContext";
import { usersApi, WeeklyXpEntry, UserStats } from "@/api/users";
import { inventoryApi, UserInventory } from "@/api/inventory";
import { achievementsApi, Achievement } from "@/api/achievements";
import { learningApi, CourseProgress } from "@/api/learning";

type ProfileNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Profile">,
  NativeStackNavigationProp<AppStackParamList>
>;
type Props = BottomTabScreenProps<TabParamList, "Profile"> & { navigation: ProfileNavigation };
type Section = "general" | "cursos" | "inventario" | "logros";
type AchFilter = "unlocked" | "locked";

interface DayXp {
  label: string;
  name: string;
  value: number;
  isPast: boolean;
}

// ─── constants ────────────────────────────────────────────────
const MAX_LIVES = 5;
const LIFE_GEM_COST = 350;
const LIFE_REGEN_SECS = 30 * 60; // 30 min por vida
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SWATCH_COLS = 6;
const SWATCH_GAP = 10;
const SWATCH_CELL_WIDTH: DimensionValue = `${100 / SWATCH_COLS}%`;

const ACH_COLS = 3;
const ACH_GUTTER = 14;
const ACH_CELL_WIDTH: DimensionValue = `${100 / ACH_COLS}%`;

const HEADER_COLORS = [
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Hueso", hex: "#F4F3F0" },
  { name: "Niebla", hex: "#E9E9EB" },
  { name: "Arena", hex: "#EDE3D2" },
  { name: "Rosa pálido", hex: "#F7DFE4" },
  { name: "Menta clara", hex: "#DCEFE4" },
  { name: "Cielo claro", hex: "#DCE8F7" },
  { name: "Lavanda", hex: "#E3DDF9" },
  { name: "Acero", hex: "#5A6B87" },
  { name: "Grafito", hex: "#3A3A3F" },
  { name: "Negro", hex: "#111111" },
  { name: "Ciruela", hex: "#8E3B76" },
  { name: "Violeta", hex: "#7857FF" },
  { name: "Índigo", hex: "#4B2ECC" },
  { name: "Marino", hex: "#1B3A8C" },
  { name: "Azul", hex: "#1E88E5" },
  { name: "Petróleo", hex: "#175E6B" },
  { name: "Turquesa", hex: "#17B7A6" },
  { name: "Verde", hex: "#35A853" },
  { name: "Bosque", hex: "#1F6B47" },
  { name: "Oliva", hex: "#7A8B36" },
  { name: "Amarillo", hex: "#FFC61A" },
  { name: "Ámbar", hex: "#FB8B24" },
  { name: "Coral", hex: "#F2603C" },
  { name: "Ladrillo", hex: "#B4482B" },
  { name: "Rojo", hex: "#E03B3B" },
  { name: "Vino", hex: "#9B2242" },
  { name: "Rosa", hex: "#E8548F" },
  { name: "Fucsia", hex: "#C13BC9" },
  { name: "Chocolate", hex: "#6B4423" },
];

const DEFAULT_INVENTORY: UserInventory = {
  gems: 0,
  streakShields: 0,
  lives: MAX_LIVES,
  xpMultiplier: 1,
  totalSignsLearned: 0,
};


// ─── helpers ──────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatLifeTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function buildDefaultWeek(): DayXp[] {
  const todayIdx = getTodayIndex();
  return DAY_LABELS.map((label, i) => ({
    label,
    name: DAY_NAMES[i],
    value: 0,
    isPast: i <= todayIdx,
  }));
}

function processWeeklyXp(data: WeeklyXpEntry[]): DayXp[] {
  const today = new Date();
  const todayIdx = getTodayIndex();
  const xpMap = new Map(data.map((e) => [e.date, e.xpEarned]));
  return DAY_LABELS.map((label, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayIdx + i);
    const dateStr = d.toISOString().slice(0, 10);
    return { label, name: DAY_NAMES[i], value: xpMap.get(dateStr) ?? 0, isPast: i <= todayIdx };
  });
}

// ─── main component ───────────────────────────────────────────
export function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const todayIdx = getTodayIndex();

  // UI state
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [headerColor, setHeaderColor] = useState(colors.surface);
  const [headerColorOpen, setHeaderColorOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(15);
  const [achievementDetailId, setAchievementDetailId] = useState<number | null>(null);
  const [achFilter, setAchFilter] = useState<AchFilter>("unlocked");
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIdx);

  // Data state (populated from API, with fallback defaults shown below)
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const firstFocus = useRef(true);
  const [weekDays, setWeekDays] = useState<DayXp[]>(buildDefaultWeek);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(15);
  const [inventory, setInventory] = useState<UserInventory>(DEFAULT_INVENTORY);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [savingGoal, setSavingGoal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [minutesToday, setMinutesToday] = useState(0);

  // Local inventory actions (optimistic)
  const [livesCount, setLivesCount] = useState(DEFAULT_INVENTORY.lives);
  const [gemsCount, setGemsCount] = useState(DEFAULT_INVENTORY.gems);
  const [xpBoostActive, setXpBoostActive] = useState(false);
  const [infiniteActive, setInfiniteActive] = useState(false);
  const [xpBoostQty, setXpBoostQty] = useState(0);
  const [infiniteQty, setInfiniteQty] = useState(0);
  const [lifeSecsLeft, setLifeSecsLeft] = useState(LIFE_REGEN_SECS);

  useEffect(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      usersApi.getSettings().then((res) => {
        const color = res.data.profileHeaderColor;
        setHeaderColor(color);
      }).catch(() => {});
    }, [])
  );

  // Life regeneration countdown
  useEffect(() => {
    if (livesCount >= MAX_LIVES || infiniteActive) return;
    let secs = LIFE_REGEN_SECS;
    setLifeSecsLeft(secs);
    const tick = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(tick);
        setLivesCount((c) => Math.min(MAX_LIVES, c + 1));
      } else {
        setLifeSecsLeft(secs);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [livesCount, infiniteActive]);

  async function loadProfile() {
    setLoading(true);
    const [profileRes, weekRes, goalRes, statsRes, invRes, unlockedRes, lockedRes, coursesRes, settingsRes] =
      await Promise.allSettled([
        usersApi.getMe(),
        usersApi.getWeeklyXp(),
        usersApi.getDailyGoal(),
        usersApi.getStats(),
        inventoryApi.getMyInventory(),
        achievementsApi.getAchievements(true),
        achievementsApi.getAchievements(false),
        learningApi.getProgress(),
        usersApi.getSettings(),
      ]);

    if (profileRes.status === "fulfilled") {
      const p = profileRes.value.data;
      setDisplayName(p.name);
      setUsername(p.username);
    } else {
      setDisplayName(user?.name ?? "");
    }

    if (weekRes.status === "fulfilled") {
      setWeekDays(processWeeklyXp(weekRes.value.data));
      setSelectedDayIndex(todayIdx);
    }

    if (goalRes.status === "fulfilled") {
      const g = goalRes.value.data;
      setDailyGoalMinutes(g.dailyGoalMinutes);
      setGoalDraft(g.dailyGoalMinutes);
      setMinutesToday(g.minutesToday);
    }

    if (statsRes.status === "fulfilled") {
      setUserStats(statsRes.value.data);
    }

    if (invRes.status === "fulfilled") {
      const inv = invRes.value.data;
      setInventory(inv);
      setLivesCount(inv.lives);
      setGemsCount(inv.gems);
      // xpBoostQty e infiniteQty no tienen campo en la API todavía; quedan en 0
    }

    if (unlockedRes.status === "fulfilled" || lockedRes.status === "fulfilled") {
      const unlocked = unlockedRes.status === "fulfilled" ? unlockedRes.value.data : [];
      const locked = lockedRes.status === "fulfilled" ? lockedRes.value.data : [];
      setAchievements([...unlocked, ...locked]);
    }

    if (coursesRes.status === "fulfilled") {
      setCourses(coursesRes.value.data);
    }

    if (settingsRes.status === "fulfilled") {
      const color = settingsRes.value.data.profileHeaderColor;
      setHeaderColor(color);
    }

    setLoading(false);
  }

  /** Picking a swatch applies it immediately and persists it — no confirm step. */
  async function applyHeaderColor(hex: string) {
    setHeaderColor(hex);
    try {
      await usersApi.updateSettings({ profileHeaderColor: hex });
    } catch {
      // optimistic update: keep local change even if API fails
    }
  }

  async function handleSaveGoal() {
    setSavingGoal(true);
    try {
      await usersApi.updateDailyGoal(goalDraft);
    } catch {
      // optimistic update: keep local change even if API fails
    } finally {
      setDailyGoalMinutes(goalDraft);
      setGoalOpen(false);
      setSavingGoal(false);
    }
  }

  // ─── computed ────────────────────────────────────────────────

  const goalPct = Math.min(100, Math.round((minutesToday / dailyGoalMinutes) * 100));
  const goalDone = minutesToday >= dailyGoalMinutes;

  const canBuyLife = gemsCount >= LIFE_GEM_COST && livesCount < MAX_LIVES;
  const canUseInfinite = infiniteQty > 0 && !infiniteActive;

  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[todayIdx];
  const selectedDayName = selectedDayIndex === todayIdx ? "Hoy" : selectedDay.name;

  const sortedAchievements = [
    ...achievements.filter((a) => a.unlocked).sort((a, b) => ((a.earnedAt ?? "") < (b.earnedAt ?? "") ? 1 : -1)),
    ...achievements.filter((a) => !a.unlocked),
  ];
  const achievementsShown = sortedAchievements.filter((a) =>
    achFilter === "unlocked" ? a.unlocked : !a.unlocked
  );
  const achievementDetail = achievements.find((a) => a.id === achievementDetailId) ?? null;

  const sections: ReadonlyArray<Segment<Section>> = [
    { key: "general", label: "General", icon: "stats-chart" },
    { key: "cursos", label: "Cursos", icon: "school" },
    { key: "inventario", label: "Inventario", icon: "cube" },
    { key: "logros", label: "Logros", icon: "trophy" },
  ];

  const achFilters: ReadonlyArray<SubTab<AchFilter>> = [
    {
      key: "unlocked",
      label: "Conseguidos",
      icon: "checkmark-circle",
      count: achievements.filter((a) => a.unlocked).length,
    },
    {
      key: "locked",
      label: "Bloqueados",
      icon: "lock-closed",
      count: achievements.filter((a) => !a.unlocked).length,
    },
  ];

  // ─── render helpers ──────────────────────────────────────────
  function renderHeader() {
    const fg = isLightColor(headerColor) ? colors.neutral900 : colors.onDark;

    return (
      <ScreenHeader
        title="Perfil"
        description={`${displayName || user?.name || "—"} · @${username || "—"}`}
        paddingTop={insets.top + 14}
        tone={headerColor}
        stats={[
          {
            key: "streak",
            label: "Racha",
            value: String(userStats?.currentStreak ?? 0),
            icon: "flame",
          },
          {
            key: "xp",
            label: "XP total",
            value: (userStats?.totalXp ?? 0).toLocaleString("es-AR"),
            icon: "flash",
          },
          {
            key: "rank",
            label: "Ranking",
            value: userStats?.weeklyRank != null ? `#${userStats.weeklyRank}` : "—",
            icon: "ribbon",
          },
        ]}
        left={
          <View style={[styles.avatar, { borderColor: fg }]}>
            <Text style={styles.avatarInitials}>{initials(displayName || "?")}</Text>
          </View>
        }
        right={
          <View style={styles.headerActions}>
            <NavIconButton
              icon="color-palette-outline"
              label="Color del encabezado"
              color={fg}
              onPress={() => setHeaderColorOpen(true)}
            />
            <NavIconButton
              icon="settings-outline"
              label="Configuración"
              color={fg}
              onPress={() => navigation.navigate("Configuration")}
            />
          </View>
        }
      />
    );
  }

  function renderGeneral() {
    const maxVal = Math.max(...weekDays.slice(0, todayIdx + 1).map((d) => d.value), 1);

    return (
      <View style={styles.section}>
        {/* Stats */}
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: "flash", color: colors.warning, value: (userStats?.totalXp ?? 0).toLocaleString("es-AR"), label: "XP total" },
            { icon: "hand-left", color: colors.courseTeal, value: String(inventory.totalSignsLearned ?? 0), label: "Señas aprendidas" },
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
          <Text style={styles.sectionTitle}>XP de la semana</Text>
          <Text style={styles.chartSelected}>
            {selectedDayName} · {selectedDay?.value ?? 0} XP
          </Text>
        </View>

        {/* Bar chart */}
        <View style={styles.chartBars}>
          {weekDays.map((d, i) => {
            const isPast = d.isPast;
            const isSelected = i === selectedDayIndex;
            const barH = isPast && d.value > 0 ? Math.max(6, (d.value / maxVal) * 68) : isPast ? 4 : 0;
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

        <View style={styles.divider} />

        {/* Daily goal */}
        <View style={styles.goalHeader}>
          <Text style={styles.sectionTitle}>Meta diaria</Text>
          <TouchableOpacity
            style={styles.goalEditBtn}
            onPress={() => { setGoalDraft(dailyGoalMinutes); setGoalOpen(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.goalEditBtnText}>{dailyGoalMinutes} min por día</Text>
            <Ionicons name="pencil" size={12} color={colors.neutral600} />
          </TouchableOpacity>
        </View>

        <View style={styles.goalBarWrap}>
          <View style={styles.goalBarLabels}>
            <Text style={styles.goalBarText}>
              {minutesToday} de {dailyGoalMinutes} min hoy
            </Text>
            <Text style={[styles.goalPct, goalDone && { color: colors.streakOrange }]}>
              {goalPct}%
            </Text>
          </View>
          <View style={styles.goalTrack}>
            <View
              style={[
                styles.goalFill,
                {
                  width: `${goalPct}%` as any,
                  backgroundColor: goalDone ? colors.streakOrange : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  function renderCursos() {
    if (courses.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cursos</Text>
          <EmptyState
            icon="school-outline"
            title="Sin cursos todavía"
            description="Cuando empieces un curso va a aparecer acá tu progreso."
          />
        </View>
      );
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cursos</Text>
        {courses.map((c) => {
          const courseColor = c.color;
          return (
            <View key={c.courseId} style={styles.courseCard}>
              <View style={styles.courseCardTop}>
                <View style={[styles.courseChip, { backgroundColor: courseColor + "1F" }]}>
                  <Ionicons name={c.icon as any} size={22} color={courseColor} />
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{c.courseName}</Text>
                  <Text style={styles.courseLessons}>
                    {c.lessonsCompleted} de {c.totalLessons} lecciones
                  </Text>
                </View>
                <Text style={[styles.coursePct, { color: courseColor }]}>
                  {c.progressPercent}%
                </Text>
              </View>

              <View style={styles.courseTrack}>
                <View
                  style={[
                    styles.courseFill,
                    { width: `${c.progressPercent}%` as any, backgroundColor: courseColor },
                  ]}
                />
              </View>

              <View style={styles.courseUnit}>
                <View style={styles.courseUnitHeader}>
                  <Text style={styles.courseUnitLabel}>{c.currentUnit}</Text>
                  <Text style={styles.courseUnitPct}>{c.unitProgressPercent}% de la unidad</Text>
                </View>
                <View style={styles.courseUnitTrack}>
                  <View
                    style={[
                      styles.courseUnitFill,
                      { width: `${c.unitProgressPercent}%` as any, backgroundColor: courseColor },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.courseFooter}>
                <View style={styles.courseMeta}>
                  <View style={styles.courseMetaItem}>
                    <Ionicons name="hand-left" size={14} color={colors.courseTeal} />
                    <Text style={styles.courseMetaText}>{c.signsLearned} señas</Text>
                  </View>
                  <View style={styles.courseMetaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.neutral600} />
                    <Text style={styles.courseMetaText}>{c.lastPractice}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.courseCtaBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.courseCtaText}>Seguir</Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.onDark} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={styles.moreCoursesBtn} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={16} color={colors.neutral900} />
          <Text style={styles.moreCoursesText}>Ver más cursos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderInventario() {
    const livesFull = livesCount >= MAX_LIVES;
    const hearts = Array.from({ length: MAX_LIVES }, (_, i) => ({
      filled: i < livesCount || infiniteActive,
    }));
    const livesTimerColor = infiniteActive
      ? colors.primaryDark
      : livesFull
      ? colors.successDark
      : colors.neutral600;
    const livesTimerBg = infiniteActive
      ? colors.primaryLight
      : livesFull
      ? colors.successLight
      : colors.neutral100;
    const livesTimer = infiniteActive ? "27:00" : livesFull ? "Completas" : formatLifeTimer(lifeSecsLeft);
    const livesTimerIcon: any = infiniteActive ? "infinite" : livesFull ? "checkmark-circle" : "time-outline";

    const boosters = [
      {
        key: "xp",
        icon: "flash",
        color: colors.warning,
        name: "Multiplicador de XP",
        desc: xpBoostActive ? "Activo · 14 min restantes" : "Duplicá tu XP durante 15 minutos",
        qty: xpBoostQty,
        active: xpBoostActive,
        actionLabel: xpBoostActive ? "Activo" : "Usar",
        onAction: () => {
          if (xpBoostQty > 0 && !xpBoostActive) {
            setXpBoostActive(true);
            setXpBoostQty((q) => q - 1);
          }
        },
      },
      {
        key: "inf",
        icon: "infinite",
        color: colors.infinitePink,
        name: "Vidas infinitas · 30 min",
        desc: infiniteActive ? "Activo · 27 min restantes" : "Practicá media hora sin perder vidas",
        qty: infiniteQty,
        active: infiniteActive,
        actionLabel: infiniteActive ? "Activo" : "Activar",
        onAction: () => {
          if (infiniteQty > 0 && !infiniteActive) {
            setInfiniteActive(true);
            setInfiniteQty((q) => q - 1);
          }
        },
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventario</Text>

        {/* Lives */}
        <View style={styles.invCard}>
          <View style={styles.invCardHeader}>
            <Text style={styles.invCardTitle}>Vidas</Text>
            <View style={[styles.livesTimer, { backgroundColor: livesTimerBg }]}>
              <Ionicons name={livesTimerIcon} size={13} color={livesTimerColor} />
              <Text style={[styles.livesTimerText, { color: livesTimerColor }]}>{livesTimer}</Text>
            </View>
          </View>
          <View style={styles.heartsRow}>
            {hearts.map((h, i) => (
              <Ionicons
                key={i}
                name={h.filled ? "heart" : "heart-outline"}
                size={26}
                color={h.filled ? colors.livesRed : colors.neutral200}
              />
            ))}
          </View>
          <View style={styles.liveBtns}>
            <TouchableOpacity
              style={[styles.lifeBtn, !canBuyLife && styles.lifeBtnDisabled]}
              onPress={() => {
                if (canBuyLife) {
                  setLivesCount((l) => l + 1);
                  setGemsCount((g) => g - LIFE_GEM_COST);
                }
              }}
              activeOpacity={canBuyLife ? 0.8 : 1}
            >
              <Ionicons name="add-circle" size={15} color={canBuyLife ? colors.onDark : "#B8B8BD"} />
              <Text style={[styles.lifeBtnText, !canBuyLife && styles.lifeBtnTextDisabled]}>
                Vida extra
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.infiniteBtn, !canUseInfinite && styles.infiniteBtnDisabled]}
              onPress={() => { if (canUseInfinite) { setInfiniteActive(true); setInfiniteQty((q) => q - 1); } }}
              activeOpacity={canUseInfinite ? 0.8 : 1}
            >
              <Ionicons name="infinite" size={16} color={canUseInfinite ? colors.neutral900 : "#B8B8BD"} />
              <Text style={[styles.infiniteBtnText, !canUseInfinite && styles.infiniteBtnTextDisabled]}>
                Vidas infinitas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gems */}
        <View style={styles.invRow}>
          <View style={[styles.invRowChip, { backgroundColor: colors.gemsBlue + "1F" }]}>
            <Ionicons name="diamond" size={22} color={colors.gemsBlueDark} />
          </View>
          <Text style={styles.invRowLabel}>Gemas</Text>
          <View style={styles.invCountChip}>
            <Text style={styles.invCountText}>{gemsCount}</Text>
          </View>
        </View>

        {/* Streak shields */}
        <View style={styles.invRow}>
          <View style={[styles.invRowChip, { backgroundColor: colors.gemsBlue + "1F" }]}>
            <Ionicons name="snow" size={22} color={colors.gemsBlueDark} />
          </View>
          <Text style={styles.invRowLabel}>Protectores de racha</Text>
          <View style={styles.invCountChip}>
            <Text style={styles.invCountText}>{inventory.streakShields}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Potenciadores</Text>
        {boosters.map((b) => {
          const ready = b.qty > 0 && !b.active;
          return (
            <View key={b.key} style={styles.boosterCard}>
              <View style={[styles.boosterChip, { backgroundColor: b.color + "1F" }]}>
                <Ionicons name={b.icon as any} size={22} color={b.color} />
              </View>
              <View style={styles.boosterInfo}>
                <View style={styles.boosterNameRow}>
                  <Text style={styles.boosterName}>{b.name}</Text>
                  <View style={[styles.boosterQtyChip, { backgroundColor: b.color + "2E" }]}>
                    <Text style={[styles.boosterQtyText, { color: b.color }]}>{b.qty}</Text>
                  </View>
                </View>
                <Text style={[styles.boosterDesc, b.active && { color: colors.successDark }]}>
                  {b.desc}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.boosterAction,
                  b.active && styles.boosterActionActive,
                  !ready && !b.active && styles.boosterActionDisabled,
                ]}
                onPress={b.onAction}
                activeOpacity={ready ? 0.8 : 1}
              >
                <Text
                  style={[
                    styles.boosterActionText,
                    b.active && styles.boosterActionTextActive,
                    !ready && !b.active && styles.boosterActionTextDisabled,
                  ]}
                >
                  {b.actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  }

  function renderLogros() {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logros</Text>

        <SubTabs options={achFilters} value={achFilter} onChange={setAchFilter} />

        {/* Grid */}
        {achievementsShown.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={achFilter === "unlocked" ? "Sin logros conseguidos" : "Sin logros bloqueados"}
            description={
              achFilter === "unlocked"
                ? "Completá lecciones y mantené tu racha para desbloquear logros."
                : "¡Ya desbloqueaste todos los logros disponibles!"
            }
          />
        ) : (
        <View style={styles.achGrid}>
          {achievementsShown.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.achItem}
              onPress={() => setAchievementDetailId(a.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.achBadge, { backgroundColor: a.unlocked ? a.color + "22" : colors.neutral100 }]}>
                <Ionicons
                  name={a.icon as any}
                  size={28}
                  color={a.unlocked ? a.color : "#B8B8BD"}
                />
                {!a.unlocked && (
                  <View style={styles.achLock}>
                    <Ionicons name="lock-closed" size={11} color={colors.neutral600} />
                  </View>
                )}
              </View>
              <Text style={[styles.achName, !a.unlocked && { color: colors.neutral600 }]} numberOfLines={2}>
                {a.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}
      </View>
    );
  }

  // ─── modals ──────────────────────────────────────────────────
  function BottomSheet({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) {
    if (!open) return null;
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <Pressable style={styles.overlay} onPress={onClose}>
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 28) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close-outline" size={16} color={colors.neutral900} />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </Pressable>
      </View>
    );
  }

  function PrimaryButton({ label, onPress, loading: btnLoading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
    return (
      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 20 }, disabled && styles.primaryBtnDisabled]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.85}
      >
        {btnLoading ? (
          <ActivityIndicator color={colors.onDark} size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {loading ? (
        <>
          {renderHeader()}
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </>
      ) : (
        <>
          {renderHeader()}
          <SegmentedControl options={sections} value={activeSection} onChange={setActiveSection} />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeSection === "general" && renderGeneral()}
            {activeSection === "cursos" && renderCursos()}
            {activeSection === "inventario" && renderInventario()}
            {activeSection === "logros" && renderLogros()}
          </ScrollView>
        </>
      )}

      {/* Header color modal */}
      <BottomSheet
        open={headerColorOpen}
        onClose={() => setHeaderColorOpen(false)}
        title="Color del encabezado"
      >
        <View style={styles.colorGrid}>
          {HEADER_COLORS.map((c) => {
            const selected = c.hex.toLowerCase() === headerColor.toLowerCase();
            const light = isLightColor(c.hex);
            return (
              <View key={c.hex} style={styles.colorCell}>
                <TouchableOpacity
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.hex, borderColor: selected ? colors.neutral900 : light ? "rgba(0,0,0,0.12)" : "transparent" },
                  ]}
                  onPress={() => applyHeaderColor(c.hex)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={15} color={light ? colors.neutral900 : colors.surface} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </BottomSheet>

      {/* Daily goal modal */}
      <BottomSheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Meta diaria">
        <View style={styles.goalEditor}>
          <TouchableOpacity
            style={styles.goalStepBtn}
            onPress={() => setGoalDraft((d) => Math.max(5, d - 5))}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
          <View style={styles.goalValueWrap}>
            <Text style={styles.goalValue}>{goalDraft}</Text>
            <Text style={styles.goalValueLabel}>minutos por día</Text>
          </View>
          <TouchableOpacity
            style={styles.goalStepBtn}
            onPress={() => setGoalDraft((d) => Math.min(120, d + 5))}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
        <PrimaryButton label="Guardar meta" onPress={handleSaveGoal} loading={savingGoal} />
      </BottomSheet>

      {/* Achievement detail modal */}
      {achievementDetail !== null && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={styles.overlay} onPress={() => setAchievementDetailId(null)}>
            <View
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 32) }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTitleRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setAchievementDetailId(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color={colors.neutral900} />
                </TouchableOpacity>
              </View>
              <View style={styles.achDetailBody}>
                <View style={[styles.achDetailBadge, { backgroundColor: achievementDetail.unlocked ? achievementDetail.color + "22" : colors.neutral100 }]}>
                  <Ionicons
                    name={achievementDetail.icon as any}
                    size={38}
                    color={achievementDetail.unlocked ? achievementDetail.color : "#B8B8BD"}
                  />
                </View>
                <Text style={styles.achDetailName}>{achievementDetail.name}</Text>
                <Text style={styles.achDetailDesc}>{achievementDetail.description}</Text>
                {!achievementDetail.unlocked && achievementDetail.progress && (
                  <View style={styles.progressPill}>
                    <Text style={styles.progressPillText}>{achievementDetail.progress}</Text>
                  </View>
                )}
                {achievementDetail.unlocked && achievementDetail.earnedLabel && (
                  <View style={styles.achEarnedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.achEarnedText}>
                      Desbloqueado {achievementDetail.earnedLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    color: colors.primary,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Common section
  section: {
    padding: 20,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 17,
    color: colors.neutral900,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral200,
    marginVertical: 24,
  },

  // Stats
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

  // Weekly XP chart
  chartHeader: {
    flexDirection: "row",
    alignItems: "baseline",
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

  // Daily goal
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  goalEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  goalEditBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.neutral600,
  },
  goalBarWrap: {
    marginTop: 14,
  },
  goalBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 7,
  },
  goalBarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.neutral900,
  },
  goalPct: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  goalTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  goalFill: {
    height: "100%",
    borderRadius: 5,
  },

  // Courses
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
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
  courseCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.text,
  },
  courseCtaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onDark,
  },
  moreCoursesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.neutral100,
    borderRadius: 14,
    padding: 14,
    marginTop: 2,
  },
  moreCoursesText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.neutral900,
  },

  // Inventory
  invCard: {
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  invCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invCardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.neutral900,
  },
  livesTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  livesTimerText: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  heartsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    justifyContent: "center",
  },
  liveBtns: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },
  lifeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 11,
    backgroundColor: colors.text,
  },
  lifeBtnDisabled: {
    backgroundColor: colors.neutral100,
  },
  lifeBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.onDark,
  },
  lifeBtnTextDisabled: {
    color: "#B8B8BD",
  },
  infiniteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 11,
    backgroundColor: colors.neutral100,
  },
  infiniteBtnDisabled: {
    opacity: 0.6,
  },
  infiniteBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.neutral900,
  },
  infiniteBtnTextDisabled: {
    color: "#B8B8BD",
  },
  invRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  invRowChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  invRowLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.neutral900,
    flex: 1,
  },
  invCountChip: {
    backgroundColor: colors.gemsBlue + "2E",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  invCountText: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.gemsBlueDark,
  },
  boosterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  boosterChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  boosterInfo: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  boosterNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  boosterName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral900,
    lineHeight: 17,
  },
  boosterQtyChip: {
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  boosterQtyText: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  boosterDesc: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.neutral600,
  },
  boosterAction: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.text,
    flexShrink: 0,
  },
  boosterActionActive: {
    backgroundColor: colors.successLight,
  },
  boosterActionDisabled: {
    backgroundColor: colors.neutral100,
  },
  boosterActionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onDark,
  },
  boosterActionTextActive: {
    color: colors.successDark,
  },
  boosterActionTextDisabled: {
    color: "#B8B8BD",
  },

  // Achievements — three responsive columns that span the full width.
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

  // Modals / sheets
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.neutral900,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // Color picker — the swatches span the full width of the sheet.
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -SWATCH_GAP / 2,
  },
  colorCell: {
    width: SWATCH_CELL_WIDTH,
    paddingHorizontal: SWATCH_GAP / 2,
    marginBottom: SWATCH_GAP,
  },
  colorSwatch: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Goal editor
  goalEditor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    marginBottom: 8,
  },
  goalStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  goalValueWrap: {
    alignItems: "center",
    minWidth: 90,
  },
  goalValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    color: colors.neutral900,
    lineHeight: 38,
  },
  goalValueLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
  },

  // Primary button
  primaryBtn: {
    width: "100%",
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: colors.neutral200,
  },
  primaryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
  },
  // Achievement detail
  achDetailBody: {
    alignItems: "center",
    textAlign: "center",
    paddingBottom: 8,
  },
  achDetailBadge: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  achDetailName: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.neutral900,
    marginTop: 14,
    textAlign: "center",
  },
  achDetailDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.neutral600,
    marginTop: 6,
    lineHeight: 20,
    textAlign: "center",
  },
  progressPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  progressPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  achEarnedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  achEarnedText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.success,
  },
});
