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
  /** `isCorrect` es null para bloques INFO (vista); true/false para bloques evaluables. */
  recordBlockInteraction: (lessonBlockId: string, isCorrect: boolean | null) =>
    apiClient.post<void>(`/learning/tracking/blocks/${lessonBlockId}/interactions`, { isCorrect }),
};
