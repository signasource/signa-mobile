import { apiClient } from "./client";
import type { PublicCourseProgress } from "./social";

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

/** Mirrors `EnrollmentSummaryResponse`: one active enrollment, with `isCurrent` marking the selected course. */
export interface EnrollmentSummary {
  courseId: string;
  courseName: string;
  coverUrl: string | null;
  /** Set when access comes from an organization; null for the user's own course. */
  organizationName: string | null;
  /** ISO instant; null when access doesn't expire. */
  accessExpiresAt: string | null;
  isCurrent: boolean;
}

export const learningApi = {
  getProgress: () => apiClient.get<CourseProgress[]>("/learning/tracking/progress"),
  /** Same endpoint as `getProgress`, typed with the shape the backend actually returns (no `courseId`). */
  getLessonCounts: () =>
    apiClient.get<PublicCourseProgress[]>("/learning/tracking/progress"),
  getEnrollments: () => apiClient.get<EnrollmentSummary[]>("/learning/tracking/enrollments"),
  /** 404 when the user isn't actively enrolled in `courseId`. */
  setCurrentCourse: (courseId: string) =>
    apiClient.patch<void>("/learning/tracking/current-course", { courseId }),
  enroll: (courseVersionId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseVersionId}/enroll`),
  /** `isCorrect` es null para bloques INFO (vista); true/false para bloques evaluables. */
  recordBlockInteraction: (lessonBlockId: string, isCorrect: boolean | null) =>
    apiClient.post<void>(`/learning/tracking/blocks/${lessonBlockId}/interactions`, { isCorrect }),
};
