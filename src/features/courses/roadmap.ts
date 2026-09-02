import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { RoadmapLessonState, RoadmapTopic } from "./api";

/**
 * Helpers de presentación para la pantalla de Inicio (recorrido de lecciones). El contenido llega
 * del back (`coursesApi.getRoadmap`); acá vive sólo el mapeo estado → visual y la decoración de
 * cada tema (color e ícono), que el back no provee.
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** Visual del nodo del riel + chip, por estado de lección que devuelve el back. */
export interface LessonStateVis {
  bg: string;
  fg: string;
  border: string;
  icon: IconName;
  chipBg: string;
  chipFg: string;
  label: string;
}

export const LESSON_STATE_VIS: Record<RoadmapLessonState, LessonStateVis> = {
  COMPLETED: {
    bg: colors.success,
    fg: colors.surface,
    border: colors.successDark,
    icon: "checkmark",
    chipBg: colors.successLight,
    chipFg: colors.successDark,
    label: "Completada",
  },
  IN_PROGRESS: {
    bg: colors.primary,
    fg: colors.onPrimary,
    border: colors.primaryDark,
    icon: "play",
    chipBg: colors.primaryLight,
    chipFg: colors.primaryDark,
    label: "En progreso",
  },
  AVAILABLE: {
    bg: colors.surface,
    fg: colors.primary,
    border: colors.primary,
    icon: "play",
    chipBg: colors.primaryLight,
    chipFg: colors.primaryDark,
    label: "Disponible",
  },
  LOCKED: {
    bg: colors.fillDark,
    fg: colors.roadmapLockedIcon,
    border: colors.roadmapLockedBorder,
    icon: "lock-closed",
    chipBg: colors.fill,
    chipFg: colors.textMuted,
    label: "Bloqueada",
  },
};

/** Color e ícono de cada tema, asignados por su `order` (el back no los provee). */
export interface TopicAccent {
  color: string;
  icon: IconName;
}

const TOPIC_ACCENTS: TopicAccent[] = [
  { color: colors.primary, icon: "hand-left" },
  { color: colors.courseTeal, icon: "chatbubbles" },
  { color: colors.gemsBlue, icon: "time" },
  { color: colors.infinitePink, icon: "people" },
  { color: colors.streakOrange, icon: "book" },
  { color: colors.success, icon: "leaf" },
];

export function accentFor(topic: RoadmapTopic): TopicAccent {
  const index = Math.max(0, topic.order - 1) % TOPIC_ACCENTS.length;
  return TOPIC_ACCENTS[index];
}

/** Progreso de un tema: lecciones completadas sobre el total, formateado `"3/6"`. */
export function progressFor(topic: RoadmapTopic): { done: number; total: number; label: string } {
  const total = topic.lessons.length;
  const done = topic.lessons.filter((l) => l.state === "COMPLETED").length;
  return { done, total, label: `${done}/${total}` };
}
