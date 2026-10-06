import { apiClient } from "./client";

export interface CourseProgress {
  courseId: string;
  courseName: string;
  icon: string;
  color: string;
  progressPercent: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentUnit: string;
  unitProgressPercent: number;
  signsLearned: number;
  lastPractice: string;
}

export const learningApi = {
  getProgress: () => apiClient.get<CourseProgress[]>("/learning/tracking/progress"),
  enroll: (courseVersionId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseVersionId}/enroll`),
  /**
   * Idempotent self-enrolment by course id. `enroll` needs a courseVersionId that no endpoint
   * exposes, so this is the only enrolment the client can actually perform.
   */
  joinFreeCourse: (courseId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseId}/join`),
  /** `isCorrect` es null para bloques INFO (vista); true/false para bloques evaluables. */
  recordBlockInteraction: (lessonBlockId: string, isCorrect: boolean | null) =>
    apiClient.post<void>(`/learning/tracking/blocks/${lessonBlockId}/interactions`, { isCorrect }),
  /** Marca la lección como completada independientemente de si cada bloque fue respondido correctamente. */
  completeLesson: (lessonId: string) =>
    apiClient.post<void>(`/learning/tracking/lessons/${lessonId}/complete`),
};
