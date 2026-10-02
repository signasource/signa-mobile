import { apiClient } from "./client";
import type { PublicCourseProgress } from "./social";

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
  /** Per-course progress of active enrollments (mirrors `CourseProgressResponse`; no `courseId`). */
  getProgress: () => apiClient.get<PublicCourseProgress[]>("/learning/tracking/progress"),
  getEnrollments: () => apiClient.get<EnrollmentSummary[]>("/learning/tracking/enrollments"),
  /** Idempotent self-enrolment in a free course by course id (`POST .../courses/{courseId}/join`). */
  joinCourse: (courseId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseId}/join`),
  /** 404 when the user isn't actively enrolled in `courseId`. */
  setCurrentCourse: (courseId: string) =>
    apiClient.patch<void>("/learning/tracking/current-course", { courseId }),
  enroll: (courseVersionId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseVersionId}/enroll`),
  /** `isCorrect` es null para bloques INFO (vista); true/false para bloques evaluables. */
  recordBlockInteraction: (lessonBlockId: string, isCorrect: boolean | null) =>
    apiClient.post<void>(`/learning/tracking/blocks/${lessonBlockId}/interactions`, { isCorrect }),
};
