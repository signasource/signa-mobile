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

/**
 * The progress row of a course. Matches by `courseId`; by name only against an older signa-api
 * that doesn't send it (two courses can share a name, so the id is the reliable key).
 */
export function progressOf(
  progress: PublicCourseProgress[],
  course: { courseId: string; courseName: string },
): PublicCourseProgress | undefined {
  return progress.find((p) =>
    p.courseId ? p.courseId === course.courseId : p.courseName === course.courseName,
  );
}

/** The enrollment a progress row belongs to (same matching as {@link progressOf}). */
export function enrollmentOf(
  enrollments: EnrollmentSummary[],
  progress: PublicCourseProgress,
): EnrollmentSummary | undefined {
  return enrollments.find((e) =>
    progress.courseId ? e.courseId === progress.courseId : e.courseName === progress.courseName,
  );
}

export const learningApi = {
  /** Per-course progress of active enrollments (mirrors `CourseProgressResponse`), one row per course. */
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
  /**
   * Idempotent self-enrolment by course id. `enroll` needs a courseVersionId that no endpoint
   * exposes, so this is the only enrolment the client can actually perform.
   */
  joinFreeCourse: (courseId: string) =>
    apiClient.post<void>(`/learning/tracking/courses/${courseId}/join`),
  /** `isCorrect` es null para bloques INFO (vista); true/false para bloques evaluables. */
  recordBlockInteraction: (lessonBlockId: string, isCorrect: boolean | null) =>
    apiClient.post<void>(`/learning/tracking/blocks/${lessonBlockId}/interactions`, { isCorrect }),
};
