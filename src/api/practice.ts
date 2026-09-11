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
 * Mirrors PracticeController.java. Practice sessions reuse real LessonContentBlock
 * data (same shape lessonsApi.getLesson returns) but attempts are recorded
 * separately from a real lesson's — see recordAttempt.
 */
export const practiceApi = {
  getSummary: () => apiClient.get<PracticeSummary>("/practice/summary"),

  getExercisesByType: (type: BlockType, limit = 10) =>
    apiClient.get<LessonContentBlock[]>("/practice/exercises", { params: { type, limit } }),

  getLearnedSigns: (limit = 50) =>
    apiClient.get<LearnedSign[]>("/practice/signs", { params: { limit } }),

  getExercisesForSign: (meaning: string, limit = 10) =>
    apiClient.get<LessonContentBlock[]>(`/practice/signs/${encodeURIComponent(meaning)}/exercises`, {
      params: { limit },
    }),

  getMistakes: (limit = 20) =>
    apiClient.get<PracticeMistake[]>("/practice/mistakes", { params: { limit } }),

  getMistakeExercises: (limit = 10) =>
    apiClient.get<LessonContentBlock[]>("/practice/mistakes/exercises", { params: { limit } }),

  /** No XP, no vidas: sólo queda registrado para el repaso de errores. */
  recordAttempt: (lessonBlockId: string, isCorrect: boolean) =>
    apiClient.post<void>("/practice/attempts", { lessonBlockId, isCorrect }),

  /**
   * Único caso de práctica libre que sí otorga XP real: terminar un lote de
   * repaso de errores. Se autolimita porque siempre opera sobre los errores
   * pendientes reales del usuario (ver docs/features/practice.md).
   */
  completeMistakeReview: () =>
    apiClient.post<{ xpEarned: number }>("/practice/mistakes/complete"),
};
