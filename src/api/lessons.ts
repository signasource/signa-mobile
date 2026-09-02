import { apiClient } from "./client";
import { LessonContent } from "@/features/courses/lessonContent.types";

/**
 * Mirrors LessonController.java. `config` dentro de cada bloque llega como
 * string JSON crudo (ver lessonContent.types.ts) y no pasa por la
 * conversión snake_case -> camelCase del interceptor de @/api/client.
 */
export const lessonsApi = {
  getLesson: (lessonId: string) => apiClient.get<LessonContent>(`/lessons/${lessonId}`),
};
