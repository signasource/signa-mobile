import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { AnimationObject } from "lottie-react-native";
import { colors } from "@/theme";

export type CelebrationKind =
  | "streak"
  | "lessons"
  | "courses"
  | "xp"
  | "weeklyXp"
  | "friends"
  | "gifts"
  | "shop"
  | "generic";

export interface CelebrationTheme {
  background: string;
  /** Icon of the reward card, and of the mock animation while `animation` is null. */
  icon: ComponentProps<typeof Ionicons>["name"];
  /**
   * Lottie shown in the middle of the screen. `null` renders a mocked animated icon instead, so a
   * real animation is a one-line change here: `animation: require("@assets/animations/<file>.json")`.
   */
  animation: AnimationObject | null;
  /** Width / height of the Lottie, so it can be sized by the free height. */
  aspect: number;
}

export const CELEBRATION_THEMES: Record<CelebrationKind, CelebrationTheme> = {
  streak: {
    background: colors.streakCelebration,
    icon: "flame",
    animation: require("@assets/animations/streak-fire.json"),
    aspect: 500 / 690,
  },
  lessons: {
    background: colors.celebrationLessons,
    icon: "book",
    animation: require("@assets/animations/achievement-lessons.json"),
    aspect: 1,
  },
  courses: {
    background: colors.celebrationCourses,
    icon: "school",
    animation: require("@assets/animations/achievement-courses.json"),
    aspect: 465 / 467,
  },
  xp: { background: colors.celebrationXp, icon: "flash", animation: null, aspect: 1 },
  weeklyXp: { background: colors.celebrationWeeklyXp, icon: "trending-up", animation: null, aspect: 1 },
  friends: { background: colors.celebrationFriends, icon: "people", animation: null, aspect: 1 },
  gifts: { background: colors.celebrationGifts, icon: "gift", animation: null, aspect: 1 },
  shop: { background: colors.celebrationShop, icon: "bag-handle", animation: null, aspect: 1 },
  generic: { background: colors.celebrationGeneric, icon: "trophy", animation: null, aspect: 1 },
};

/** Backend `criteriaType` → celebration group. Unknown/new types fall back to `generic`. */
export function kindFor(criteriaType: string): CelebrationKind {
  switch (criteriaType) {
    case "STREAK_DAYS":
    case "STREAK_DAYS_NO_SHIELD":
      return "streak";
    case "LESSONS_COMPLETED":
      return "lessons";
    case "COURSES_COMPLETED":
      return "courses";
    case "TOTAL_XP":
      return "xp";
    case "WEEKLY_XP":
      return "weeklyXp";
    case "FRIENDS_COUNT":
      return "friends";
    case "GIFTS_SENT":
      return "gifts";
    case "SHOP_PURCHASES":
      return "shop";
    default:
      return "generic";
  }
}

/** 5000 → "5.000" (es-AR). Done by hand: `toLocaleString` is unreliable on Hermes/Android. */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** The big line of the celebration screen. `value` is the achievement's threshold. */
export function headlineFor(kind: CelebrationKind, value: number): string {
  const n = formatCount(value);
  switch (kind) {
    case "streak":
      return `¡Llegaste a ${n} días de racha!`;
    case "lessons":
      return value === 1 ? "¡Completaste tu primera lección!" : `¡Completaste ${n} lecciones!`;
    case "courses":
      return value === 1 ? "¡Completaste tu primer curso!" : `¡Completaste ${n} cursos!`;
    case "xp":
      return `¡Ya sumaste ${n} XP!`;
    case "weeklyXp":
      return `¡${n} XP en una sola semana!`;
    case "friends":
      return value === 1 ? "¡Hiciste tu primer amigo!" : `¡Ya tenés ${n} amigos!`;
    case "gifts":
      return value === 1 ? "¡Enviaste tu primer regalo!" : `¡Ya enviaste ${n} regalos!`;
    case "shop":
      return value === 1 ? "¡Hiciste tu primera compra!" : `¡Ya hiciste ${n} compras!`;
    case "generic":
      return "¡Logro desbloqueado!";
  }
}

export function subtitleFor(kind: CelebrationKind): string {
  switch (kind) {
    case "streak":
      return "Seguís aprendiendo todos los días. ¡Así se hace!";
    case "friends":
      return "Aprender entre amigos se disfruta más.";
    case "gifts":
    case "shop":
      return "Gracias por ser parte de Signa.";
    default:
      return "Cada paso cuenta. ¡Seguí así!";
  }
}
