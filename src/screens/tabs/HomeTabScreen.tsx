import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { TabParamList } from "@/navigation/TabNavigator";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { usersApi } from "@/api/users";
import { inventoryApi } from "@/api/inventory";
import {
  coursesApi,
  CourseRoadmap,
  RoadmapLesson,
  RoadmapLessonState,
  RoadmapTopic,
} from "@/features/courses/api";
import { accentFor, progressFor } from "@/features/courses/roadmap";

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Home">,
  NativeStackNavigationProp<AppStackParamList>
>;
type Props = BottomTabScreenProps<TabParamList, "Home"> & { navigation: HomeNavigation };

function ctaFor(state: RoadmapLessonState): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
} {
  switch (state) {
    case "COMPLETED":
      return { label: "Repasar", icon: "refresh", enabled: true };
    case "IN_PROGRESS":
      return { label: "Seguir", icon: "play", enabled: true };
    case "AVAILABLE":
      return { label: "Empezar", icon: "play", enabled: true };
    default:
      return { label: "Bloqueada", icon: "lock-closed", enabled: false };
  }
}

async function fetchRoadmap(): Promise<CourseRoadmap> {
  const { data: languages } = await coursesApi.getSignLanguages();
  const lsa = languages.find((l) => l.code === "LSA") ?? languages[0];
  if (!lsa) throw new Error("No hay lenguas de señas disponibles.");

  const { data: catalog } = await coursesApi.getCatalog(lsa.id);
  const course = catalog.content[0];
  if (!course) throw new Error("Todavía no hay cursos disponibles.");

  const { data: roadmap } = await coursesApi.getRoadmap(course.id);
  return roadmap;
}

function findCurrentLessonId(topics: RoadmapTopic[]): string | null {
  for (const topic of topics) {
    const found = topic.lessons.find((l) => l.state === "IN_PROGRESS");
    if (found) return found.id;
  }
  for (const topic of topics) {
    const found = topic.lessons.find((l) => l.state === "AVAILABLE");
    if (found) return found.id;
  }
  return null;
}

export function HomeTabScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState(0);
  const [gems, setGems] = useState(0);
  const [xp, setXp] = useState(0);
  const [roadmap, setRoadmap] = useState<CourseRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<{
    lesson: RoadmapLesson;
    unitLabel: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    Promise.all([usersApi.getStats(), inventoryApi.getMyInventory()])
      .then(([stats, inventory]) => {
        setStreak(stats.data.currentStreak);
        setXp(stats.data.totalXp);
        setGems(inventory.data.gems);
      })
      .catch(() => {});
    try {
      setRoadmap(await fetchRoadmap());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "No pudimos cargar tu curso.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const currentLessonId = roadmap ? findCurrentLessonId(roadmap.topics) : null;
  const cta = openLesson ? ctaFor(openLesson.lesson.state) : null;

  function navigateToLesson(lesson: RoadmapLesson, unitLabel: string) {
    setOpenLesson(null);
    navigation.navigate("Lesson", { lessonId: lesson.id, unitLabel, signsCount: lesson.signsCount });
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <ScreenHeader
        title="Tu recorrido"
        description="Seguí la ruta lección por lección y sumá señas todos los días."
        paddingTop={insets.top + 14}
        tone={colors.primary}
        stats={[
          { key: "streak", label: "Racha", value: String(streak), icon: "flame" },
          { key: "gems", label: "Gemas", value: gems.toLocaleString("es-AR"), icon: "diamond" },
          { key: "xp", label: "XP", value: xp.toLocaleString("es-AR"), icon: "flash" },
        ]}
      />

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <EmptyState icon="cloud-offline-outline" title="No pudimos cargar tu curso" description={error} />
          <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {roadmap?.topics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              currentLessonId={currentLessonId}
              onInfo={(lesson) => setOpenLesson({ lesson, unitLabel: topic.title })}
              onNavigate={(lesson) => navigateToLesson(lesson, topic.title)}
            />
          ))}
          {roadmap && roadmap.topics.length === 0 && (
            <EmptyState
              icon="book-outline"
              title="Todavía no hay contenido"
              description="Cuando este curso tenga lecciones, las vas a ver acá."
            />
          )}
        </ScrollView>
      )}

      {/* ── Lesson info modal (centered) ── */}
      <Modal
        visible={!!openLesson}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenLesson(null)}
        statusBarTranslucent
      >
        {openLesson && cta && (
          <Pressable style={styles.modalBackdrop} onPress={() => setOpenLesson(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalKicker}>Seguí acá</Text>
                {openLesson.lesson.xpTotal > 0 && (
                  <View style={styles.modalXpPill}>
                    <Text style={styles.modalXpText}>+{openLesson.lesson.xpTotal} XP</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalTitle}>{openLesson.lesson.name}</Text>
              {!!openLesson.lesson.description && (
                <Text style={styles.modalDescription}>{openLesson.lesson.description}</Text>
              )}

              {/* Sign chips */}
              {openLesson.lesson.signsLearned && openLesson.lesson.signsLearned.length > 0 && (
                <View style={styles.signChipsRow}>
                  {openLesson.lesson.signsLearned.map((sign) => (
                    <View key={sign} style={styles.signChip}>
                      <Text style={styles.signChipText}>{sign}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.ctaButton, !cta.enabled && styles.ctaButtonDisabled]}
                onPress={() => {
                  if (cta.enabled) navigateToLesson(openLesson.lesson, openLesson.unitLabel);
                }}
                disabled={!cta.enabled}
                activeOpacity={0.86}
              >
                <Ionicons
                  name={cta.icon}
                  size={17}
                  color={cta.enabled ? colors.onDark : colors.roadmapLockedIcon}
                />
                <Text style={[styles.ctaText, !cta.enabled && styles.ctaTextDisabled]}>
                  {cta.label}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        )}
      </Modal>
    </View>
  );
}

// ── Topic section ────────────────────────────────────────────────────────────

function TopicSection({
  topic,
  currentLessonId,
  onInfo,
  onNavigate,
}: {
  topic: RoadmapTopic;
  currentLessonId: string | null;
  onInfo: (lesson: RoadmapLesson) => void;
  onNavigate: (lesson: RoadmapLesson) => void;
}) {
  const accent = accentFor(topic);
  const progress = progressFor(topic);
  const locked = topic.lessons.every((l) => l.state === "LOCKED");

  return (
    <View>
      {/* Unit header row */}
      <View style={styles.unitRow}>
        <View style={styles.railSegment} />
        <View
          style={[
            styles.unitIcon,
            { backgroundColor: locked ? colors.fillDark : accent.color },
          ]}
        >
          <Ionicons
            name={locked ? "lock-closed" : accent.icon}
            size={locked ? 20 : 22}
            color={locked ? colors.roadmapLockedIcon : colors.onPrimary}
          />
        </View>
        <View style={styles.unitContent}>
          <View style={styles.unitMeta}>
            <Text style={styles.unitKicker}>{topic.title}</Text>
            <Text style={styles.unitProgress}>
              {progress.done} de {progress.total}
            </Text>
          </View>
          {!!topic.subtitle && (
            <Text style={[styles.unitTitle, locked && styles.unitTitleLocked]}>
              {topic.subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Lesson rows */}
      {topic.lessons.map((lesson) => {
        const isCurrent = lesson.id === currentLessonId;
        return (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isCurrent={isCurrent}
            onInfo={() => onInfo(lesson)}
            onNavigate={() => onNavigate(lesson)}
          />
        );
      })}
    </View>
  );
}

// ── Lesson row dispatcher ────────────────────────────────────────────────────

function LessonRow({
  lesson,
  isCurrent,
  onInfo,
  onNavigate,
}: {
  lesson: RoadmapLesson;
  isCurrent: boolean;
  onInfo: () => void;
  onNavigate: () => void;
}) {
  if (isCurrent) {
    return <CurrentLessonCard lesson={lesson} onInfo={onInfo} onNavigate={onNavigate} />;
  }
  if (lesson.state === "COMPLETED") {
    return <CompletedLessonRow lesson={lesson} onNavigate={onNavigate} />;
  }
  if (lesson.state === "AVAILABLE") {
    return <AvailableLessonRow lesson={lesson} onInfo={onInfo} />;
  }
  return <LockedLessonRow lesson={lesson} />;
}

function CompletedLessonRow({
  lesson,
  onNavigate,
}: {
  lesson: RoadmapLesson;
  onNavigate: () => void;
}) {
  return (
    <View style={styles.lessonRow}>
      <View style={styles.railSegment} />
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
      </View>
      <View style={styles.lessonRowContent}>
        <Text style={styles.completedName}>{lesson.name}</Text>
        <TouchableOpacity style={styles.replayBtn} onPress={onNavigate} activeOpacity={0.8}>
          <Ionicons name="refresh" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CurrentLessonCard({
  lesson,
  onInfo,
  onNavigate,
}: {
  lesson: RoadmapLesson;
  onInfo: () => void;
  onNavigate: () => void;
}) {
  return (
    <View style={[styles.lessonRow, styles.lessonRowTop]}>
      <View style={styles.railSegment} />
      <View style={[styles.dotCol, styles.dotColTop]}>
        <View style={styles.currentDotOuter}>
          <View style={styles.currentDotMid}>
            <View style={styles.currentDot} />
          </View>
        </View>
      </View>
      <View style={styles.lessonCard}>
        <Text style={styles.cardKicker}>Seguí acá</Text>
        <Text style={styles.cardTitle}>{lesson.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardCta} onPress={onNavigate} activeOpacity={0.86}>
            <Ionicons name="play" size={17} color={colors.onDark} />
            <Text style={styles.cardCtaText}>Seguir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardInfoBtn} onPress={onInfo} activeOpacity={0.8}>
            <Ionicons name="information-circle-outline" size={20} color={colors.neutral900} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AvailableLessonRow({
  lesson,
  onInfo,
}: {
  lesson: RoadmapLesson;
  onInfo: () => void;
}) {
  return (
    <TouchableOpacity style={styles.lessonRow} onPress={onInfo} activeOpacity={0.85}>
      <View style={styles.railSegment} />
      <View style={styles.dotCol}>
        <View style={[styles.dot, styles.dotAvailable]} />
      </View>
      <Text style={styles.availableName}>{lesson.name}</Text>
    </TouchableOpacity>
  );
}

function LockedLessonRow({ lesson }: { lesson: RoadmapLesson }) {
  return (
    <View style={styles.lessonRow}>
      <View style={styles.railSegment} />
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: colors.fillDark }]} />
      </View>
      <Text style={styles.lockedName}>{lesson.name}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const COL_W = 44; // left rail column width
const DOT_SZ = 22;
const RAIL_X = (COL_W - 2) / 2; // left edge of 2px line = 21 (centered in 44px column)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Loading / error / empty
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  retryButton: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.onDark,
  },

  // Timeline
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Shared rail segment (absolute, spans full row height including paddingBottom)
  railSegment: {
    position: "absolute",
    left: RAIL_X,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.roadmapLockedBorder,
  },

  // Unit header row
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 20,
  },
  unitIcon: {
    width: COL_W,
    height: COL_W,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  unitContent: { flex: 1, minWidth: 0, zIndex: 1 },
  unitMeta: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  unitKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  unitProgress: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  unitTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.lg,
    lineHeight: 23,
    color: colors.text,
    marginTop: 3,
  },
  unitTitleLocked: { color: colors.roadmapLockedIcon },

  // Lesson rows
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 16,
  },
  lessonRowTop: { alignItems: "flex-start" },

  // Dot column
  dotCol: {
    width: COL_W,
    alignItems: "center",
    zIndex: 1,
  },
  dotColTop: { paddingTop: 26 },
  dot: {
    width: DOT_SZ,
    height: DOT_SZ,
    borderRadius: DOT_SZ / 2,
  },
  dotAvailable: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  // Current lesson concentric rings
  currentDotOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  currentDotMid: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  currentDot: {
    width: DOT_SZ,
    height: DOT_SZ,
    borderRadius: DOT_SZ / 2,
    backgroundColor: colors.primary,
  },

  // Lesson name labels
  lessonRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 1,
  },
  completedName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
  availableName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    zIndex: 1,
  },
  lockedName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.roadmapLockedIcon,
    zIndex: 1,
  },
  replayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },

  // Current lesson card
  lessonCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    zIndex: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  cardTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 19,
    lineHeight: 23,
    color: colors.text,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  cardCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
  },
  cardCtaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
  },
  cardInfoBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal (centered overlay)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(36,26,22,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modalKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  modalXpPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  modalXpText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 11,
    color: colors.primary,
  },
  modalTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    lineHeight: 27,
    color: colors.text,
    marginTop: 8,
  },
  modalDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: colors.text,
    marginTop: 20,
  },
  ctaButtonDisabled: { backgroundColor: colors.neutral100 },
  ctaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
  },
  ctaTextDisabled: { color: colors.roadmapLockedIcon },

  // Sign chips inside the lesson modal
  signChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },
  signChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  signChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.primaryDark,
  },
  signChipSkeleton: {
    width: 60,
    height: 26,
    backgroundColor: colors.fill,
  },
});
