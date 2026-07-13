import { apiClient } from "@/api/client";
import { Course, Lesson } from "./types";

/**
 * STUB - signa-api todavia no tiene endpoints de contenido. Estos paths
 * son un PLACEHOLDER para saber donde va a ir esto, no estan confirmados.
 */
export const coursesApi = {
  list: () => apiClient.get<Course[]>("/courses"),
  getById: (courseId: string) => apiClient.get<Course>(`/courses/${courseId}`),
  getLesson: (courseId: string, lessonId: string) =>
    apiClient.get<Lesson>(`/courses/${courseId}/lessons/${lessonId}`),
};
