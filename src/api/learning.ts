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
};
