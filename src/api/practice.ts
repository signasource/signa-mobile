import { apiClient } from "./client";
import { BlockType, LessonContentBlock } from "@/features/courses/lessonContent.types";

/** Mirrors PracticeSummaryResponse.java. */
export interface PracticeSummary {
  signsLearnedCount: number;
  exercisesDoneCount: number;
}

/** Mirrors LearnedSignResponse.java. No animation URL — see signsApi.getSignAnimations. */
export interface LearnedSign {
  sign: string;
}

/** Mirrors PracticeMistakeResponse.java. */
export interface PracticeMistake {
  lessonBlockId: string;
  type: BlockType;
  misses: number;
}

/**
 * Mirrors PracticeController.java. Every list/exercise call takes an optional `courseId` (a course
 * id, not a version): omitted = all enrolled courses, set = only that course (Práctica libre's
 * course filter). Axios drops `undefined` params, so the unfiltered call is unchanged.
 * Practice sessions reuse real LessonContentBlock
 * data (same shape lessonsApi.getLesson returns) but attempts are recorded
 * separately from a real lesson's — see recordAttempt.
 */
export const practiceApi = {
  getSummary: () => apiClient.get<PracticeSummary>("/practice/summary"),

  getExercisesByType: (type: BlockType, courseId?: string, limit = 10) =>
    apiClient.get<LessonContentBlock[]>("/practice/exercises", {
      params: { type, limit, courseId },
    }),

  getLearnedSigns: (courseId?: string, limit = 200) =>
    apiClient.get<LearnedSign[]>("/practice/signs", { params: { limit, courseId } }),

  getExercisesForSign: (meaning: string, courseId?: string, limit = 10) =>
    apiClient.get<LessonContentBlock[]>(`/practice/signs/${encodeURIComponent(meaning)}/exercises`, {
      params: { limit, courseId },
    }),

  getMistakes: (courseId?: string, limit = 20) =>
    apiClient.get<PracticeMistake[]>("/practice/mistakes", { params: { limit, courseId } }),

  getMistakeExercises: (courseId?: string, limit = 10) =>
    apiClient.get<LessonContentBlock[]>("/practice/mistakes/exercises", {
      params: { limit, courseId },
    }),

  /**
   * Records the attempt and grants XP immediately when correct — unlike lesson exercises
   * which only pay out on lesson completion. Returns xpEarned = 0 when wrong or the
   * block carries no reward.
   */
  recordAttempt: (lessonBlockId: string, isCorrect: boolean) =>
    apiClient.post<{ xpEarned: number }>("/practice/attempts", { lessonBlockId, isCorrect }),

  /**
   * Additional XP bonus for finishing a mistake-review batch. Se autolimita porque
   * siempre opera sobre los errores pendientes reales del usuario (ver docs/features/practice.md).
   */
  completeMistakeReview: () =>
    apiClient.post<{ xpEarned: number }>("/practice/mistakes/complete"),
};
