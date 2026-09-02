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
import { accentFor, LESSON_STATE_VIS, progressFor } from "@/features/courses/roadmap";

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Home">,
  NativeStackNavigationProp<AppStackParamList>
>;
type Props = BottomTabScreenProps<TabParamList, "Home"> & { navigation: HomeNavigation };

/** Fondo tenue del ícono de la unidad: color de marca al ~13% de opacidad. */
function tint(color: string): string {
  return color + "22";
}

function railColor(state: RoadmapLessonState): string {
  if (state === "COMPLETED") return colors.success;
  if (state === "IN_PROGRESS" || state === "AVAILABLE") return colors.primary;
  return colors.fillDark;
}

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

/** Resuelve LSA → primer curso del catálogo → recorrido del curso. */
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

export function HomeTabScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState(0);
  const [gems, setGems] = useState(0);
  const [xp, setXp] = useState(0);
  const [roadmap, setRoadmap] = useState<CourseRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<{ lesson: RoadmapLesson; unitLabel: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Stats del header: no bloquean el recorrido (contenido principal de la pantalla).
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

  useFocusEffect(load);

  const sheetVis = openLesson ? LESSON_STATE_VIS[openLesson.lesson.state] : null;
  const cta = openLesson ? ctaFor(openLesson.lesson.state) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.coursePill}>
          <Ionicons name="school" size={16} color={colors.primaryDark} />
          <Text style={styles.coursePillText} numberOfLines={1}>
            {roadmap?.courseName ?? "Curso"}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={20} color={colors.livesRed} />
            <Text style={styles.statValue}>{streak}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="diamond" size={19} color={colors.gemsBlue} />
            <Text style={styles.statValue}>{gems.toLocaleString("es-AR")}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color={colors.streakOrange} />
            <Text style={styles.statValue}>{xp.toLocaleString("es-AR")}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
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
            <UnitBlock
              key={topic.id}
              topic={topic}
              onOpen={(lesson) => setOpenLesson({ lesson, unitLabel: topic.title })}
            />
          ))}
          {roadmap && roadmap.topics.length === 0 && (
            <Text style={styles.emptyText}>Este curso todavía no tiene contenido.</Text>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!openLesson}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenLesson(null)}
        statusBarTranslucent
      >
        {openLesson && sheetVis && cta && (
          <Pressable style={styles.backdrop} onPress={() => setOpenLesson(null)}>
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
              onPress={() => {}}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetCloseRow}>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setOpenLesson(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={17} color={colors.neutral900} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetTitleRow}>
                <View
                  style={[
                    styles.sheetMedallion,
                    { backgroundColor: sheetVis.bg, borderColor: sheetVis.border },
                  ]}
                >
                  <Ionicons name={sheetVis.icon} size={26} color={sheetVis.fg} />
                </View>
                <Text style={styles.sheetTitle}>{openLesson.lesson.name}</Text>
              </View>

              {!!openLesson.lesson.description && (
                <Text style={styles.sheetDescription}>{openLesson.lesson.description}</Text>
              )}

              <View style={styles.sheetMetaRow}>
                <View style={styles.sheetMetaItem}>
                  <Ionicons name="star" size={16} color={colors.warning} />
                  <Text style={styles.sheetMetaText}>
                    {openLesson.lesson.xpTotal > 0 ? `+${openLesson.lesson.xpTotal} XP` : "Sin XP"}
                  </Text>
                </View>
                <View style={styles.sheetMetaItem}>
                  <Ionicons name="albums" size={16} color={colors.courseTeal} />
                  <Text style={styles.sheetMetaText}>
                    {openLesson.lesson.blockCount === 1
                      ? "1 ejercicio"
                      : `${openLesson.lesson.blockCount} ejercicios`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.cta, !cta.enabled && styles.ctaDisabled]}
                onPress={() => {
                  setOpenLesson(null);
                  if (cta.enabled) {
                    navigation.navigate("Lesson", {
                      lessonId: openLesson.lesson.id,
                      unitLabel: openLesson.unitLabel,
                    });
                  }
                }}
                disabled={!cta.enabled}
                activeOpacity={0.86}
              >
                <Ionicons
                  name={cta.icon}
                  size={17}
                  color={cta.enabled ? colors.surface : colors.roadmapLockedIcon}
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

function UnitBlock({
  topic,
  onOpen,
}: {
  topic: RoadmapTopic;
  onOpen: (lesson: RoadmapLesson) => void;
}) {
  const progress = progressFor(topic);
  const accent = accentFor(topic);
  const locked = topic.lessons.every((l) => l.state === "LOCKED");
  return (
    <View style={styles.unitBlock}>
      <View style={styles.unitHeader}>
        <View style={[styles.unitChip, { backgroundColor: tint(accent.color) }]}>
          <Ionicons name={accent.icon} size={18} color={accent.color} />
        </View>
        <View style={styles.unitHeaderTexts}>
          <Text style={styles.unitKicker}>{topic.title}</Text>
          {!!topic.subtitle && (
            <Text style={[styles.unitTitle, locked && styles.unitTitleLocked]}>
              {topic.subtitle}
            </Text>
          )}
        </View>
        <Text style={styles.unitProgress}>{progress.label}</Text>
      </View>
      {!!topic.description && <Text style={styles.unitDescription}>{topic.description}</Text>}

      <View style={styles.lessons}>
        {topic.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} onOpen={onOpen} />
        ))}
      </View>
    </View>
  );
}

function LessonRow({
  lesson,
  onOpen,
}: {
  lesson: RoadmapLesson;
  onOpen: (lesson: RoadmapLesson) => void;
}) {
  const vis = LESSON_STATE_VIS[lesson.state];
  const isDim = lesson.state === "LOCKED";
  return (
    <View style={styles.lessonRow}>
      <View style={styles.rail}>
        <View style={[styles.railLine, { backgroundColor: railColor(lesson.state) }]} />
        <View style={[styles.node, { backgroundColor: vis.bg, borderColor: vis.border }]}>
          <Ionicons name={vis.icon} size={21} color={vis.fg} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.lessonCard, lesson.state === "IN_PROGRESS" && styles.lessonCardActive]}
        onPress={() => onOpen(lesson)}
        activeOpacity={0.85}
      >
        <View style={styles.lessonCardTop}>
          <Text style={[styles.lessonName, isDim && styles.lessonNameDim]}>{lesson.name}</Text>
          <View style={[styles.stateChip, { backgroundColor: vis.chipBg }]}>
            <Text style={[styles.stateChipText, { color: vis.chipFg }]}>{vis.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const RAIL_WIDTH = 46;
const NODE_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  coursePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 12,
    flexShrink: 1,
  },
  coursePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.md,
    color: colors.text,
  },

  // Loading / error / empty
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 26,
    paddingTop: 24,
  },

  // Timeline
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  unitBlock: {
    paddingHorizontal: 26,
    marginBottom: 4,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 7,
  },
  unitChip: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unitHeaderTexts: {
    flex: 1,
    minWidth: 0,
  },
  unitKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  unitTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.md,
    lineHeight: 20,
    color: colors.text,
  },
  unitTitleLocked: {
    color: colors.textMuted,
  },
  unitProgress: {
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.xs,
    color: colors.neutral600,
  },
  unitDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: colors.textMuted,
    marginBottom: 4,
  },
  lessons: {
    marginTop: 4,
  },

  // Lesson row (rail + card)
  lessonRow: {
    flexDirection: "row",
    gap: 14,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: "center",
  },
  railLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  node: {
    marginTop: 18,
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonCard: {
    flex: 1,
    minWidth: 0,
    marginBottom: 26,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  lessonCardActive: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  lessonCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lessonName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
  },
  lessonNameDim: {
    color: colors.roadmapLockedIcon,
  },
  stateChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stateChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },

  // Lesson modal (bottom sheet)
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetCloseRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  sheetMedallion: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: colors.neutral900,
  },
  sheetDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 14,
  },
  sheetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  sheetMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetMetaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: colors.primary,
  },
  ctaDisabled: {
    backgroundColor: colors.neutral100,
  },
  ctaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
  },
  ctaTextDisabled: {
    color: colors.roadmapLockedIcon,
  },
});
